require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// Import routes
const authRoutes = require('./routes/auth');
const parentRoutes = require('./routes/parent');
const childRoutes = require('./routes/child');
const locationRoutes = require('./routes/location');
const appRoutes = require('./routes/apps');

// Import models
const Child = require('./models/Child');
const Location = require('./models/Location');
const AppUsage = require('./models/AppUsage');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/guardiaparent', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/child', childRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/apps', appRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Child device connection
  socket.on('child_connect', async (data) => {
    try {
      const { childId } = data;
      const child = await Child.findOne({ childId });
      
      if (child) {
        child.socketId = socket.id;
        child.lastSeen = new Date();
        child.isOnline = true;
        await child.save();
        
        socket.join(`child_${childId}`);
        
        // Notify parent
        io.to(`parent_${child.parentId}`).emit('child_status', {
          childId,
          status: 'online'
        });
      }
    } catch (error) {
      console.error('Child connection error:', error);
    }
  });

  // Location update from child
  socket.on('location_update', async (data) => {
    try {
      const { latitude, longitude, accuracy, timestamp } = data;
      const child = await Child.findOne({ socketId: socket.id });
      
      if (child) {
        // Save location
        const location = new Location({
          childId: child._id,
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(timestamp)
        });
        await location.save();
        
        // Update child's current location
        child.currentLocation = {
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(timestamp)
        };
        child.lastSeen = new Date();
        await child.save();
        
        // Notify parent
        io.to(`parent_${child.parentId}`).emit('location_update', {
          childId: child.childId,
          location: child.currentLocation
        });
      }
    } catch (error) {
      console.error('Location update error:', error);
    }
  });

  // Emergency location
  socket.on('emergency_location', async (data) => {
    try {
      const child = await Child.findOne({ socketId: socket.id });
      if (child) {
        io.to(`parent_${child.parentId}`).emit('emergency', {
          childId: child.childId,
          childName: child.name,
          location: child.currentLocation,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Emergency location error:', error);
    }
  });

  // Child is safe
  socket.on('im_safe', async (data) => {
    try {
      const child = await Child.findOne({ socketId: socket.id });
      if (child) {
        io.to(`parent_${child.parentId}`).emit('child_safe', {
          childId: child.childId,
          childName: child.name,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Im safe error:', error);
    }
  });

  // App usage update
  socket.on('app_usage', async (data) => {
    try {
      const { appName, duration, timestamp } = data;
      const child = await Child.findOne({ socketId: socket.id });
      
      if (child) {
        const usage = new AppUsage({
          childId: child._id,
          appName,
          duration,
          timestamp: new Date(timestamp)
        });
        await usage.save();
      }
    } catch (error) {
      console.error('App usage error:', error);
    }
  });

  // Battery level update
  socket.on('battery_update', async (data) => {
    try {
      const { level, isCharging } = data;
      const child = await Child.findOne({ socketId: socket.id });
      
      if (child) {
        child.batteryLevel = level;
        child.isCharging = isCharging;
        await child.save();
        
        // Notify parent if battery is low
        if (level <= 15 && !isCharging) {
          io.to(`parent_${child.parentId}`).emit('alert', {
            type: 'battery_low',
            childId: child.childId,
            childName: child.name,
            level,
            message: `بطارية ${child.name} منخفضة: ${level}%`
          });
        }
      }
    } catch (error) {
      console.error('Battery update error:', error);
    }
  });

  // Parent connection
  socket.on('parent_connect', async (data) => {
    try {
      const { parentId } = data;
      socket.join(`parent_${parentId}`);
      console.log('👨‍👩‍👧 Parent connected:', parentId);
    } catch (error) {
      console.error('Parent connection error:', error);
    }
  });

  // Send command to child
  socket.on('send_command', async (data) => {
    try {
      const { childId, command } = data;
      const child = await Child.findOne({ childId });
      
      if (child && child.socketId) {
        io.to(child.socketId).emit('command', command);
      }
    } catch (error) {
      console.error('Send command error:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    try {
      const child = await Child.findOne({ socketId: socket.id });
      if (child) {
        child.isOnline = false;
        child.lastSeen = new Date();
        await child.save();
        
        io.to(`parent_${child.parentId}`).emit('child_status', {
          childId: child.childId,
          status: 'offline'
        });
      }
      console.log('🔌 Client disconnected:', socket.id);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
});

module.exports = { app, io };