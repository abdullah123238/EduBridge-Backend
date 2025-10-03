const mongoose = require('mongoose');

const progressTrackingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'skipped'],
    default: 'not_started'
  },
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  completionDate: {
    type: Date
  },
  // For video/audio materials
  watchTime: {
    type: Number, // in seconds
    default: 0
  },
  totalDuration: {
    type: Number, // in seconds
    default: 0
  },
  // For interactive materials
  interactions: [{
    type: {
      type: String,
      enum: ['click', 'scroll', 'pause', 'resume', 'seek', 'download']
    },
    timestamp: {
      type: Number, // in seconds from start
      required: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  // Learning analytics
  learningPath: [{
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material'
    },
    accessedAt: {
      type: Date,
      default: Date.now
    },
    timeSpent: Number
  }],
  // Notes and bookmarks
  notes: [{
    content: String,
    timestamp: Number, // for video/audio materials
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  bookmarks: [{
    title: String,
    timestamp: Number, // for video/audio materials
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Rating and feedback
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Compound indexes for better performance
progressTrackingSchema.index({ student: 1, material: 1 }, { unique: true });
progressTrackingSchema.index({ student: 1, course: 1 });
progressTrackingSchema.index({ material: 1, status: 1 });
progressTrackingSchema.index({ lastAccessed: -1 });

// Methods
progressTrackingSchema.methods.updateProgress = function(progressData) {
  this.progressPercentage = progressData.progressPercentage;
  this.timeSpent = progressData.timeSpent;
  this.watchTime = progressData.watchTime;
  this.lastAccessed = new Date();
  
  if (this.progressPercentage >= 90) {
    this.status = 'completed';
    this.completionDate = new Date();
  } else if (this.progressPercentage > 0) {
    this.status = 'in_progress';
  }
  
  return this.save();
};

progressTrackingSchema.methods.addInteraction = function(interaction) {
  this.interactions.push(interaction);
  return this.save();
};

progressTrackingSchema.methods.addNote = function(note) {
  this.notes.push(note);
  return this.save();
};

progressTrackingSchema.methods.addBookmark = function(bookmark) {
  this.bookmarks.push(bookmark);
  return this.save();
};

module.exports = mongoose.model('ProgressTracking', progressTrackingSchema);




