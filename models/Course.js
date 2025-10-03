const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a course title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Please provide a course code'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Course code cannot be more than 20 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a course description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  lecturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a lecturer']
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

courseSchema.index({ code: 1 });
courseSchema.index({ lecturer: 1 });

module.exports = mongoose.model('Course', courseSchema); 