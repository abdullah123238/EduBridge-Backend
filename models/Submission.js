const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Please provide a task']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a student']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Please provide a course']
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'graded', 'returned', 'resubmitted'],
    default: 'draft'
  },
  submittedAt: {
    type: Date
  },
  gradedAt: {
    type: Date
  },
  // Submission content
  content: {
    type: String,
    maxlength: [10000, 'Content cannot be more than 10000 characters']
  },
  // File submissions
  files: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Quiz answers
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    answer: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    isCorrect: Boolean,
    points: {
      type: Number,
      default: 0
    }
  }],
  // Grading
  score: {
    type: Number,
    min: 0,
    default: 0
  },
  maxScore: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', null],
    default: null
  },
  // Feedback
  feedback: {
    type: String,
    maxlength: [2000, 'Feedback cannot be more than 2000 characters']
  },
  instructorNotes: {
    type: String,
    maxlength: [1000, 'Instructor notes cannot be more than 1000 characters']
  },
  // Grading details
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gradingCriteria: [{
    criterion: String,
    points: Number,
    earned: Number,
    feedback: String
  }],
  // Attempt tracking
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1
  },
  previousAttempts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  }],
  // Time tracking
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  // Late submission
  isLate: {
    type: Boolean,
    default: false
  },
  latePenalty: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Plagiarism detection
  plagiarismScore: {
    type: Number,
    min: 0,
    max: 100
  },
  plagiarismReport: {
    type: String
  },
  // Peer review
  peerReviews: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    score: Number,
    feedback: String,
    reviewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Comments and discussions
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Comment cannot be more than 1000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInstructor: {
      type: Boolean,
      default: false
    }
  }],
  // Version control
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    content: String,
    files: [mongoose.Schema.Types.Mixed],
    submittedAt: Date,
    version: Number
  }]
}, {
  timestamps: true
});

// Compound indexes
submissionSchema.index({ task: 1, student: 1 }, { unique: true });
submissionSchema.index({ course: 1, status: 1 });
submissionSchema.index({ student: 1, submittedAt: -1 });
submissionSchema.index({ gradedBy: 1, gradedAt: -1 });

// Virtual for isGraded
submissionSchema.virtual('isGraded').get(function() {
  return this.status === 'graded' && this.score !== null;
});

// Virtual for isPassing
submissionSchema.virtual('isPassing').get(function() {
  return this.percentage >= 60; // Assuming 60% is passing
});

// Methods
submissionSchema.methods.calculateGrade = function() {
  if (this.score === null || this.maxScore === 0) {
    return null;
  }
  
  this.percentage = (this.score / this.maxScore) * 100;
  
  // Grade calculation
  if (this.percentage >= 97) this.grade = 'A+';
  else if (this.percentage >= 93) this.grade = 'A';
  else if (this.percentage >= 90) this.grade = 'A-';
  else if (this.percentage >= 87) this.grade = 'B+';
  else if (this.percentage >= 83) this.grade = 'B';
  else if (this.percentage >= 80) this.grade = 'B-';
  else if (this.percentage >= 77) this.grade = 'C+';
  else if (this.percentage >= 73) this.grade = 'C';
  else if (this.percentage >= 70) this.grade = 'C-';
  else if (this.percentage >= 67) this.grade = 'D+';
  else if (this.percentage >= 63) this.grade = 'D';
  else if (this.percentage >= 60) this.grade = 'D-';
  else this.grade = 'F';
  
  return this.grade;
};

submissionSchema.methods.markAsSubmitted = function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  
  // Check if submission is late
  const task = mongoose.model('Task').findById(this.task);
  if (task && this.submittedAt > task.dueDate) {
    this.isLate = true;
  }
  
  return this.save();
};

submissionSchema.methods.gradeSubmission = function(gradingData) {
  this.score = gradingData.score;
  this.maxScore = gradingData.maxScore;
  this.feedback = gradingData.feedback;
  this.instructorNotes = gradingData.instructorNotes;
  this.gradedBy = gradingData.gradedBy;
  this.gradingCriteria = gradingData.gradingCriteria;
  this.status = 'graded';
  this.gradedAt = new Date();
  
  this.calculateGrade();
  
  return this.save();
};

submissionSchema.methods.addComment = function(commentData) {
  this.comments.push({
    author: commentData.author,
    content: commentData.content,
    isInstructor: commentData.isInstructor || false
  });
  
  return this.save();
};

module.exports = mongoose.model('Submission', submissionSchema);
