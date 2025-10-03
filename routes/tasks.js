const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTask,
  getCourseTasks,
  getTask,
  updateTask,
  deleteTask,
  getStudentTasks,
  getLecturerTasks,
  getTaskStats,
  toggleTaskStatus
} = require('../controllers/taskController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Task creation (lecturer only)
router.post('/', authorize('lecturer'), [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('course').isMongoId().withMessage('Invalid course ID'),
  body('type').isIn(['assignment', 'quiz', 'project', 'discussion', 'reading']).withMessage('Invalid task type'),
  body('dueDate').isISO8601().withMessage('Invalid due date'),
  body('maxPoints').optional().isInt({ min: 0 }).withMessage('Max points must be a positive integer'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority level')
], validate, createTask);

// Get tasks for a course
router.get('/course/:courseId', [
  param('courseId').isMongoId().withMessage('Invalid course ID')
], validate, getCourseTasks);

// Get student's tasks
router.get('/student/tasks', getStudentTasks);

// Get lecturer's tasks
router.get('/lecturer/tasks', authorize('lecturer'), getLecturerTasks);

// Get specific task
router.get('/:taskId', [
  param('taskId').isMongoId().withMessage('Invalid task ID')
], validate, getTask);

// Get task statistics (lecturer only)
router.get('/:taskId/stats', authorize('lecturer'), [
  param('taskId').isMongoId().withMessage('Invalid task ID')
], validate, getTaskStats);

// Update task (lecturer only)
router.put('/:taskId', authorize('lecturer'), [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date'),
  body('maxPoints').optional().isInt({ min: 0 }).withMessage('Max points must be a positive integer')
], validate, updateTask);

// Toggle task status (lecturer only)
router.patch('/:taskId/status', authorize('lecturer'), [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  body('status').isIn(['draft', 'published', 'closed']).withMessage('Invalid status')
], validate, toggleTaskStatus);

// Delete task (lecturer only)
router.delete('/:taskId', authorize('lecturer'), [
  param('taskId').isMongoId().withMessage('Invalid task ID')
], validate, deleteTask);

module.exports = router;
