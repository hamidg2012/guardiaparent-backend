const express = require('express');
const AppUsage = require('../models/AppUsage');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get child's app usage
router.get('/:childId', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { childId: req.params.childId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const usage = await AppUsage.find(query)
      .sort({ timestamp: -1 });
    
    // Aggregate by app
    const aggregated = {};
    usage.forEach(record => {
      if (!aggregated[record.appName]) {
        aggregated[record.appName] = {
          appName: record.appName,
          totalDuration: 0,
          sessions: 0
        };
      }
      aggregated[record.appName].totalDuration += record.duration;
      aggregated[record.appName].sessions += 1;
    });
    
    res.json({ usage: Object.values(aggregated) });
  } catch (error) {
    console.error('Get app usage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's usage
router.get('/:childId/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const usage = await AppUsage.aggregate([
      {
        $match: {
          childId: req.params.childId,
          timestamp: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$appName',
          totalDuration: { $sum: '$duration' },
          sessions: { $sum: 1 }
        }
      }
    ]);
    
    res.json({ usage });
  } catch (error) {
    console.error('Get today usage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
