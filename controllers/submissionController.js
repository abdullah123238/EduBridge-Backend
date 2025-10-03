const Submission = require('../models/Submission');
const Task = require('../models/Task');
const Course = require('../models/Course');

// Create a new submission
const createSubmission = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const studentId = req.user.id;

    // Check if task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if submission is allowed
    const canSubmit = task.canSubmit(studentId);
    if (!canSubmit.canSubmit) {
      return res.status(400).json({
        success: false,
        message: canSubmit.reason
      });
    }

    // Check if submission already exists
    const existingSubmission = await Submission.findOne({
      task: taskId,
      student: studentId
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Submission already exists for this task'
      });
    }

    const submissionData = {
      ...req.body,
      task: taskId,
      student: studentId,
      course: task.course,
      maxScore: task.maxPoints,
      startTime: new Date()
    };

    const submission = await Submission.create(submissionData);

    res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Submit assignment
const submitAssignment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const studentId = req.user.id;

    const submission = await Submission.findOne({
      task: taskId,
      student: studentId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if already submitted
    if (submission.status === 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Assignment already submitted'
      });
    }

    // Update submission with submitted data
    submission.content = req.body.content;
    submission.files = req.body.files || [];
    submission.answers = req.body.answers || [];
    submission.endTime = new Date();
    submission.timeSpent = submission.endTime - submission.startTime;

    await submission.markAsSubmitted();

    res.status(200).json({
      success: true,
      message: 'Assignment submitted successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Get submission
const getSubmission = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const studentId = req.user.id;

    const submission = await Submission.findOne({
      task: taskId,
      student: studentId
    }).populate('task', 'title description type maxPoints dueDate')
       .populate('gradedBy', 'name email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Get all submissions for a task (instructor only)
const getTaskSubmissions = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Check if user is instructor for this task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (task.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view submissions for this task'
      });
    }

    let query = { task: taskId };
    if (status) {
      query.status = status;
    }

    const submissions = await Submission.find(query)
      .populate('student', 'name email')
      .populate('gradedBy', 'name email')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Submission.countDocuments(query);

    res.status(200).json({
      success: true,
      data: submissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Grade submission
const gradeSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback, instructorNotes, gradingCriteria } = req.body;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user is authorized to grade
    const task = await Task.findById(submission.task);
    if (task.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to grade this submission'
      });
    }

    const gradingData = {
      score,
      maxScore: submission.maxScore,
      feedback,
      instructorNotes,
      gradedBy: req.user.id,
      gradingCriteria
    };

    await submission.gradeSubmission(gradingData);

    res.status(200).json({
      success: true,
      message: 'Submission graded successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Get student's submissions
const getStudentSubmissions = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 10, status, courseId } = req.query;

    let query = { student: studentId };
    
    if (status) {
      query.status = status;
    }
    
    if (courseId) {
      query.course = courseId;
    }

    const submissions = await Submission.find(query)
      .populate('task', 'title type dueDate maxPoints')
      .populate('course', 'title code')
      .populate('gradedBy', 'name email')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Submission.countDocuments(query);

    res.status(200).json({
      success: true,
      data: submissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add comment to submission
const addComment = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { content } = req.body;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user is authorized to comment
    const task = await Task.findById(submission.task);
    const isInstructor = task.createdBy.toString() === req.user.id || req.user.role === 'admin';
    const isStudent = submission.student.toString() === req.user.id;

    if (!isInstructor && !isStudent) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this submission'
      });
    }

    await submission.addComment({
      author: req.user.id,
      content,
      isInstructor
    });

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Update submission
const updateSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const studentId = req.user.id;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user owns the submission
    if (submission.student.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this submission'
      });
    }

    // Check if submission can be updated
    if (submission.status === 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update submitted assignment'
      });
    }

    const updatedSubmission = await Submission.findByIdAndUpdate(
      submissionId,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Submission updated successfully',
      data: updatedSubmission
    });
  } catch (error) {
    next(error);
  }
};

// Delete submission
const deleteSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const studentId = req.user.id;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user owns the submission
    if (submission.student.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this submission'
      });
    }

    // Check if submission can be deleted
    if (submission.status === 'graded') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete graded submission'
      });
    }

    await Submission.findByIdAndDelete(submissionId);

    res.status(200).json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSubmission,
  submitAssignment,
  getSubmission,
  getTaskSubmissions,
  gradeSubmission,
  getStudentSubmissions,
  addComment,
  updateSubmission,
  deleteSubmission
};




