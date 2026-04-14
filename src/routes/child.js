const express = require('express');
const { body, validationResult } = require('express-validator');
const Child = require('../models/Child');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all children for parent
router.get('/', authMiddleware, async (req, res) => {
  try {
    const children = await Child.find({ parentId: req.parentId });
    res.json({ children });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add child
router.post('/', authMiddleware, [
  body('name').notEmpty().withMessage('Name is required'),
  body('age').isInt({ min: 1, max: 18 }).withMessage('Invalid age')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, age } = req.body;
    
    // Generate unique child ID
    const childId = `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const child = new Child({
      childId,
      parentId: req.parentId,
      name,
      age
    });

    await child.save();

    res.status(201).json({ message: 'Child added successfully', child });
  } catch (error) {
    console.error('Add child error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update child settings
router.put('/:childId', authMiddleware, async (req, res) => {
  try {
    const { safeZones, appLimits, lockedApps } = req.body;
    
    const child = await Child.findOne({ childId: req.params.childId, parentId: req.parentId });
    
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    if (safeZones) child.safeZones = safeZones;
    if (appLimits) child.appLimits = appLimits;
    if (lockedApps) child.lockedApps = lockedApps;

    await child.save();

    res.json({ message: 'Child updated successfully', child });
  } catch (error) {
    console.error('Update child error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete child
router.delete('/:childId', authMiddleware, async (req, res) => {
  try {
    const child = await Child.findOneAndDelete({ childId: req.params.childId, parentId: req.parentId });
    
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    res.json({ message: 'Child deleted successfully' });
  } catch (error) {
    console.error('Delete child error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
