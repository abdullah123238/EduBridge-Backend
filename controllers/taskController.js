const Task = require('../models/Task');
const Submission = require('../models/Submission');
const Course = require('../models/Course');

// Create a new task
const createTask = async (req, res, next) => {
  try {
    const { course } = req.body;

    // Validate that the lecturer owns the course
    if (req.user.role === 'lecturer') {
      const courseExists = await Course.findById(course);
      if (!courseExists) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (courseExists.lecturer.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only create assignments for courses you teach'
        });
      }
    }

    const taskData = {
      ...req.body,
      createdBy: req.user.id
    };

    const task = await Task.create(taskData);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// Get tasks for a course
const getCourseTasks = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10, type, status } = req.query;

    let query = { course: courseId };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .populate('createdBy', 'name email')
      .populate('course', 'title code')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      data: tasks,
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

// Get a specific task
const getTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('createdBy', 'name email')
      .populate('course', 'title code')
      .populate('prerequisites');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Compute whether current user can submit and include reason
    let canSubmitInfo = { canSubmit: false, reason: 'Authentication required' };
    try {
      if (req.user && req.user.id) {
        canSubmitInfo = task.canSubmit(req.user.id);
      }
    } catch (_) {
      // keep default
    }

    const taskObject = task.toObject();

    res.status(200).json({
      success: true,
      data: {
        ...taskObject,
        canSubmit: canSubmitInfo,
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a task
const updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user is authorized to update
    if (task.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email').populate('course', 'title code');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

// Delete a task
const deleteTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user is authorized to delete
    if (task.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task'
      });
    }

    // Delete related submissions
    await Submission.deleteMany({ task: taskId });

    await Task.findByIdAndDelete(taskId);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get student's tasks
const getStudentTasks = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 10, status, type } = req.query;

    // Get courses the student is enrolled in
    const User = require('../models/User');
    const user = await User.findById(studentId).populate('enrolledCourses');
    const courseIds = user.enrolledCourses.map(course => course._id);

    let query = { 
      course: { $in: courseIds },
      status: 'published'
    };
    
    if (type) {
      query.type = type;
    }

    const tasks = await Task.find(query)
      .populate('course', 'title code')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get submission status for each task
    const tasksWithSubmissions = await Promise.all(
      tasks.map(async (task) => {
        const submission = await Submission.findOne({
          task: task._id,
          student: studentId
        });

        return {
          ...task.toObject(),
          submission: submission || null,
          canSubmit: task.canSubmit(studentId)
        };
      })
    );

    const total = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      data: tasksWithSubmissions,
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

// Get lecturer's tasks
const getLecturerTasks = async (req, res, next) => {
  try {
    const lecturerId = req.user.id;
    const { page = 1, limit = 10, status, type } = req.query;

    let query = { 
      createdBy: lecturerId
    };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .populate('course', 'title code enrolledStudents')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get submission statistics for each task
    const tasksWithStats = await Promise.all(
      tasks.map(async (task) => {
        const submissions = await Submission.find({ task: task._id });
        const totalSubmissions = submissions.length;
        const gradedSubmissions = submissions.filter(s => s.status === 'graded').length;
        const pendingGrading = submissions.filter(s => s.status === 'submitted').length; // Only count submitted, not graded

        return {
          ...task.toObject(),
          totalSubmissions,
          gradedSubmissions,
          pendingGrading
        };
      })
    );

    const total = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      data: tasksWithStats,
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

// Get task statistics
const getTaskStats = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get submission statistics
    const submissions = await Submission.find({ task: taskId });
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.status === 'graded');
    const averageScore = gradedSubmissions.length > 0 
      ? gradedSubmissions.reduce((sum, s) => sum + s.score, 0) / gradedSubmissions.length 
      : 0;

    // Get course enrollment count
    const Course = require('../models/Course');
    const course = await Course.findById(task.course).populate('students');
    const totalStudents = course.students.length;

    const completionRate = totalStudents > 0 ? (totalSubmissions / totalStudents) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        task: task,
        stats: {
          totalStudents,
          totalSubmissions,
          gradedSubmissions: gradedSubmissions.length,
          averageScore,
          completionRate,
          lateSubmissions: submissions.filter(s => s.isLate).length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Publish/unpublish task
const toggleTaskStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user is authorized
    if (task.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this task'
      });
    }

    task.status = status;
    await task.save();

    res.status(200).json({
      success: true,
      message: `Task ${status === 'published' ? 'published' : 'unpublished'} successfully`,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getCourseTasks,
  getTask,
  updateTask,
  deleteTask,
  getStudentTasks,
  getLecturerTasks,
  getTaskStats,
  toggleTaskStatus
};
