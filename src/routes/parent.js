const express = require('express');
const Parent = require('../models/Parent');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get parent profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const parent = await Parent.findById(req.parentId).select('-password');
    res.json({ parent });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update parent profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, notifications } = req.body;
    
    const parent = await Parent.findById(req.parentId);
    
    if (name) parent.name = name;
    if (phone) parent.phone = phone;
    if (notifications) parent.notifications = notifications;
    
    await parent.save();
    
    res.json({ message: 'Profile updated successfully', parent });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
