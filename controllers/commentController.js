const Comment = require('../models/Comment');
const Announcement = require('../models/Announcement');
const Course = require('../models/Course');

const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const { announcementId } = req.params;

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }
    const course = await Course.findById(announcement.course);
    const isEnrolled = course.students.includes(req.user.id);
    const isLecturer = course.lecturer.toString() === req.user.id;

    if (!isEnrolled && !isLecturer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this announcement'
      });
    }

    const comment = await Comment.create({
      content,
      announcement: announcementId,
      user: req.user.id
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'name email')
      .populate('announcement', 'title');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: populatedComment
    });
  } catch (error) {
    next(error);
  }
};

const getComments = async (req, res, next) => {
  try {
    const { announcementId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    const course = await Course.findById(announcement.course);
    const isEnrolled = course.students.includes(req.user.id);
    const isLecturer = course.lecturer.toString() === req.user.id;

    if (!isEnrolled && !isLecturer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view comments for this announcement'
      });
    }

    const comments = await Comment.find({ announcement: announcementId })
      .populate('user', 'name email')
      .populate('announcement', 'title')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: 1 });

    const total = await Comment.countDocuments({ announcement: announcementId });

    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    let comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { 
        content,
        isEdited: true,
        editedAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate('announcement', 'title');

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: comment
    });
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const announcement = await Announcement.findById(comment.announcement);
    const isCommentAuthor = comment.user.toString() === req.user.id;
    const isAnnouncementCreator = announcement.createdBy.toString() === req.user.id;

    if (!isCommentAuthor && !isAnnouncementCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addComment,
  getComments,
  updateComment,
  deleteComment
}; 