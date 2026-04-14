const express = require('express');
const Location = require('../models/Location');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get child's location history
router.get('/:childId', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    
    const query = { childId: req.params.childId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const locations = await Location.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json({ locations });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get child's current location
router.get('/:childId/current', authMiddleware, async (req, res) => {
  try {
    const Child = require('../models/Child');
    const child = await Child.findOne({ childId: req.params.childId });
    
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }
    
    res.json({ 
      location: child.currentLocation,
      isOnline: child.isOnline,
      lastSeen: child.lastSeen
    });
  } catch (error) {
    console.error('Get current location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

