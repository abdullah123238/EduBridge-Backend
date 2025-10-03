const mongoose = require('mongoose');

const materialPageProgressSchema = new mongoose.Schema({
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
  // Page tracking for multi-page documents
  pages: [{
    pageNumber: {
      type: Number,
      required: true
    },
    timeSpent: {
      type: Number, // in seconds
      default: 0
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    minTimeRequired: {
      type: Number, // minimum 6 minutes in seconds
      default: 360
    },
    maxTimeAllowed: {
      type: Number, // maximum 12 minutes in seconds
      default: 720
    },
    canProceed: {
      type: Boolean,
      default: false
    }
  }],
  // Overall material progress
  totalPages: {
    type: Number,
    required: true
  },
  completedPages: {
    type: Number,
    default: 0
  },
  canDownload: {
    type: Boolean,
    default: false
  },
  // Session tracking
  currentPage: {
    type: Number,
    default: 1
  },
  sessionStartTime: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // Reading behavior tracking
  readingSessions: [{
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    pagesViewed: [Number],
    totalTimeSpent: Number
  }]
}, {
  timestamps: true
});

// Compound indexes for better performance
materialPageProgressSchema.index({ student: 1, material: 1 }, { unique: true });
materialPageProgressSchema.index({ student: 1, course: 1 });
materialPageProgressSchema.index({ material: 1 });

// Methods
materialPageProgressSchema.methods.startPageReading = function(pageNumber) {
  const page = this.pages.find(p => p.pageNumber === pageNumber);
  if (!page) {
    // Create new page entry
    this.pages.push({
      pageNumber,
      startTime: new Date(),
      minTimeRequired: 360, // 6 minutes
      maxTimeAllowed: 720,   // 12 minutes
      canProceed: false
    });
  } else {
    // Resume existing page
    page.startTime = new Date();
  }
  
  this.currentPage = pageNumber;
  this.lastActivity = new Date();
  
  return this.save();
};

materialPageProgressSchema.methods.updatePageTime = function(pageNumber, timeSpent) {
  const page = this.pages.find(p => p.pageNumber === pageNumber);
  if (!page) return this;
  
  page.timeSpent = timeSpent;
  page.lastActivity = new Date();
  
  // Check if minimum time requirement is met
  if (timeSpent >= page.minTimeRequired) {
    page.canProceed = true;
  }
  
  // Check if maximum time is exceeded
  if (timeSpent > page.maxTimeAllowed) {
    page.canProceed = false;
  }
  
  return this.save();
};

materialPageProgressSchema.methods.completePage = function(pageNumber) {
  const page = this.pages.find(p => p.pageNumber === pageNumber);
  if (!page) return this;
  
  page.isCompleted = true;
  page.endTime = new Date();
  
  // Update completed pages count
  this.completedPages = this.pages.filter(p => p.isCompleted).length;
  
  // Check if all pages are completed
  if (this.completedPages === this.totalPages) {
    this.canDownload = true;
  }
  
  return this.save();
};

materialPageProgressSchema.methods.canNavigateToPage = function(pageNumber) {
  // Can always go to page 1
  if (pageNumber === 1) return true;
  
  // Check if previous pages are completed
  for (let i = 1; i < pageNumber; i++) {
    const page = this.pages.find(p => p.pageNumber === i);
    if (!page || !page.isCompleted) {
      return false;
    }
  }
  
  return true;
};

materialPageProgressSchema.methods.getReadingProgress = function() {
  const totalTimeSpent = this.pages.reduce((total, page) => total + page.timeSpent, 0);
  const progressPercentage = (this.completedPages / this.totalPages) * 100;
  
  return {
    completedPages: this.completedPages,
    totalPages: this.totalPages,
    progressPercentage: Math.round(progressPercentage),
    totalTimeSpent,
    canDownload: this.canDownload,
    currentPage: this.currentPage
  };
};

module.exports = mongoose.model('MaterialPageProgress', materialPageProgressSchema);



