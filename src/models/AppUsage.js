const mongoose = require('mongoose');

const appUsageSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true
  },
  appName: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true // in seconds
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
appUsageSchema.index({ childId: 1, timestamp: -1 });
appUsageSchema.index({ childId: 1, appName: 1, timestamp: -1 });

module.exports = mongoose.model('AppUsage', appUsageSchema);
