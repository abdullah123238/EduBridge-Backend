const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createSubmission,
  submitAssignment,
  getSubmission,
  getTaskSubmissions,
  gradeSubmission,
  getStudentSubmissions,
  addComment,
  updateSubmission,
  deleteSubmission
} = require('../controllers/submissionController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create submission (student only)
router.post('/task/:taskId', authorize('student'), [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  body('content').optional().isLength({ max: 10000 }).withMessage('Content cannot exceed 10000 characters')
], validate, createSubmission);

// Submit assignment (student only)
router.post('/task/:taskId/submit', authorize('student'), [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  body('content').optional().isLength({ max: 10000 }).withMessage('Content cannot exceed 10000 characters'),
  body('files').optional().isArray().withMessage('Files must be an array'),
  body('answers').optional().isArray().withMessage('Answers must be an array')
], validate, submitAssignment);

// Get submission
router.get('/task/:taskId', [
  param('taskId').isMongoId().withMessage('Invalid task ID')
], validate, getSubmission);

// Get student's submissions
router.get('/student/submissions', getStudentSubmissions);

// Get all submissions for a task (lecturer only)
router.get('/task/:taskId/all', authorize('lecturer'), [
  param('taskId').isMongoId().withMessage('Invalid task ID')
], validate, getTaskSubmissions);

// Grade submission (lecturer only)
router.post('/:submissionId/grade', authorize('lecturer'), [
  param('submissionId').isMongoId().withMessage('Invalid submission ID'),
  body('score').isFloat({ min: 0 }).withMessage('Score must be a positive number'),
  body('feedback').optional().isLength({ max: 2000 }).withMessage('Feedback cannot exceed 2000 characters'),
  body('instructorNotes').optional().isLength({ max: 1000 }).withMessage('Instructor notes cannot exceed 1000 characters')
], validate, gradeSubmission);

// Add comment to submission
router.post('/:submissionId/comment', [
  param('submissionId').isMongoId().withMessage('Invalid submission ID'),
  body('content').notEmpty().isLength({ max: 1000 }).withMessage('Comment content is required and cannot exceed 1000 characters')
], validate, addComment);

// Update submission (student only)
router.put('/:submissionId', authorize('student'), [
  param('submissionId').isMongoId().withMessage('Invalid submission ID'),
  body('content').optional().isLength({ max: 10000 }).withMessage('Content cannot exceed 10000 characters'),
  body('files').optional().isArray().withMessage('Files must be an array')
], validate, updateSubmission);

// Delete submission (student only)
router.delete('/:submissionId', authorize('student'), [
  param('submissionId').isMongoId().withMessage('Invalid submission ID')
], validate, deleteSubmission);

module.exports = router;




