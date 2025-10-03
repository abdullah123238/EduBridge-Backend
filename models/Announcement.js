const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide an announcement title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  body: {
    type: String,
    required: [true, 'Please provide announcement content'],
    maxlength: [2000, 'Content cannot be more than 2000 characters']
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
  isImportant: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: String,
    fileUrl: String,
    fileType: String
  }]
}, {
  timestamps: true
});

announcementSchema.index({ course: 1, createdAt: -1 });
announcementSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Announcement', announcementSchema); 