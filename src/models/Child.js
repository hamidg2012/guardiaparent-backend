const mongoose = require('mongoose');

const childSchema = new mongoose.Schema({
  childId: {
    type: String,
    required: true,
    unique: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number
  },
  deviceId: {
    type: String,
    unique: true
  },
  socketId: {
    type: String
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    timestamp: Date
  },
  batteryLevel: {
    type: Number,
    default: 100
  },
  isCharging: {
    type: Boolean,
    default: false
  },
  safeZones: [{
    name: String,
    latitude: Number,
    longitude: Number,
    radius: Number // in meters
  }],
  appLimits: {
    type: Map,
    of: Number, // duration in seconds
    default: {}
  },
  lockedApps: [String],
  lastZoneStatus: {
    type: Map,
    of: Boolean,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Child', childSchema);
