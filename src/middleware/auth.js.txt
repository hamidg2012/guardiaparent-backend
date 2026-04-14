const jwt = require('jsonwebtoken');
const Parent = require('../models/Parent');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const parent = await Parent.findById(decoded.parentId);
    
    if (!parent) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    req.parentId = parent._id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
