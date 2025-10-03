const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a task title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a task description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Please provide a course']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide the creator']
  },
  type: {
    type: String,
    enum: ['assignment', 'quiz', 'project', 'discussion', 'reading'],
    required: [true, 'Please specify the task type']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    required: [true, 'Please provide a due date']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  // Assignment specific fields
  maxPoints: {
    type: Number,
    default: 100,
    min: 0
  },
  instructions: {
    type: String,
    maxlength: [5000, 'Instructions cannot be more than 5000 characters']
  },
  // File requirements
  allowedFileTypes: [{
    type: String,
    enum: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'gif', 'mp4', 'mp3', 'zip']
  }],
  maxFileSize: {
    type: Number, // in MB
    default: 10
  },
  maxFiles: {
    type: Number,
    default: 1,
    min: 1
  },
  // Quiz specific fields
  questions: [{
    question: {
      type: String,
      required: true,
      maxlength: [1000, 'Question cannot be more than 1000 characters']
    },
    type: {
      type: String,
      enum: ['multiple_choice', 'true_false', 'short_answer', 'essay'],
      required: true
    },
    options: [{
      text: String,
      isCorrect: Boolean
    }],
    correctAnswer: String,
    points: {
      type: Number,
      default: 1,
      min: 0
    },
    explanation: String
  }],
  // Grading settings
  gradingType: {
    type: String,
    enum: ['automatic', 'manual', 'peer'],
    default: 'manual'
  },
  passingScore: {
    type: Number,
    default: 60,
    min: 0,
    max: 100
  },
  attempts: {
    type: Number,
    default: 1,
    min: 1
  },
  timeLimit: {
    type: Number, // in minutes
    default: null
  },
  // Grading type specific settings
  automaticGrading: {
    rubric: [{
      criterion: String,
      points: Number,
      description: String
    }],
    autoScoreRules: [{
      keyword: String,
      points: Number,
      description: String
    }]
  },
  peerReviewSettings: {
    numberOfReviewers: {
      type: Number,
      default: 2,
      min: 1,
      max: 5
    },
    reviewCriteria: [String],
    anonymousReview: {
      type: Boolean,
      default: true
    },
    reviewDeadline: Date
  },
  manualGradingSettings: {
    rubric: [{
      criterion: String,
      points: Number,
      description: String
    }],
    gradingCriteria: [String]
  },
  // Visibility and access
  isVisible: {
    type: Boolean,
    default: true
  },
  requiresSubmission: {
    type: Boolean,
    default: true
  },
  // Tags and categories
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    trim: true
  },
  // Prerequisites
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  // Learning objectives
  learningObjectives: [{
    type: String,
    maxlength: [500, 'Learning objective cannot be more than 500 characters']
  }],
  // Resources and materials
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['link', 'file', 'video', 'document']
    }
  }],
  // Analytics
  totalSubmissions: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  completionRate: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ course: 1, status: 1 });
taskSchema.index({ createdBy: 1, type: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ tags: 1 });

// Virtual for time remaining
taskSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const due = new Date(this.dueDate);
  return Math.max(0, due - now);
});

// Virtual for isOverdue
taskSchema.virtual('isOverdue').get(function() {
  return new Date() > new Date(this.dueDate);
});

// Methods
taskSchema.methods.updateStats = async function() {
  const Submission = mongoose.model('Submission');
  
  const submissions = await Submission.find({ task: this._id });
  this.totalSubmissions = submissions.length;
  
  if (submissions.length > 0) {
    const totalScore = submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
    this.averageScore = totalScore / submissions.length;
    
    const completedSubmissions = submissions.filter(sub => sub.status === 'graded');
    this.completionRate = (completedSubmissions.length / submissions.length) * 100;
  }
  
  return this.save();
};

taskSchema.methods.canSubmit = function(userId) {
  const now = new Date();
  
  // Check if task is published and visible
  if (this.status !== 'published' || !this.isVisible) {
    return { canSubmit: false, reason: 'Task is not available for submission' };
  }
  
  // Check if due date has passed
  if (now > this.dueDate) {
    return { canSubmit: false, reason: 'Submission deadline has passed' };
  }
  
  // Check if start date has been reached
  if (now < this.startDate) {
    return { canSubmit: false, reason: 'Task is not yet available' };
  }
  
  return { canSubmit: true };
};

module.exports = mongoose.model('Task', taskSchema);
