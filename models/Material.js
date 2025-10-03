const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a material title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  fileUrl: {
    type: String,
    required: [true, 'Please provide a file URL']
  },
  fileName: {
    type: String,
    required: [true, 'Please provide a file name']
  },
  fileType: {
    type: String,
    required: [true, 'Please provide a file type']
  },
  fileSize: {
    type: Number,
    required: [true, 'Please provide file size']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Please provide a course']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide the uploader']
  },
  category: {
    type: String,
    default: 'other'
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

materialSchema.index({ course: 1, uploadedAt: -1 });
materialSchema.index({ uploadedBy: 1 });
materialSchema.index({ category: 1 });

module.exports = mongoose.model('Material', materialSchema); 