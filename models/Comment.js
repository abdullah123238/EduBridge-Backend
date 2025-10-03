const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Please provide comment content'],
    maxlength: [1000, 'Comment cannot be more than 1000 characters']
  },
  announcement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Announcement',
    required: [true, 'Please provide an announcement']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a user']
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

commentSchema.index({ announcement: 1, createdAt: -1 });
commentSchema.index({ user: 1 });

module.exports = mongoose.model('Comment', commentSchema); 