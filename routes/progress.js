const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getMaterialProgress,
  updateMaterialProgress,
  getCourseProgress,
  getStudentProgress,
  addNote,
  addBookmark,
  rateMaterial,
  getCoursesProgress,
  getMaterialsProgress,
  getTasksProgress,
  getCourseStudents,
  getCourseMaterials,
  getStudentProgressDetail,
  getStudentMaterials,
  getStudentAssignments
} = require('../controllers/progressController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Material progress routes
router.get('/material/:materialId', [
  param('materialId').isMongoId().withMessage('Invalid material ID')
], validate, getMaterialProgress);

router.put('/material/:materialId', [
  param('materialId').isMongoId().withMessage('Invalid material ID'),
  body('progressPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
  body('timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be a positive integer'),
  body('watchTime').optional().isInt({ min: 0 }).withMessage('Watch time must be a positive integer')
], validate, updateMaterialProgress);

router.post('/material/:materialId/note', [
  param('materialId').isMongoId().withMessage('Invalid material ID'),
  body('content').notEmpty().withMessage('Note content is required'),
  body('timestamp').optional().isInt({ min: 0 }).withMessage('Timestamp must be a positive integer')
], validate, addNote);

router.post('/material/:materialId/bookmark', [
  param('materialId').isMongoId().withMessage('Invalid material ID'),
  body('title').notEmpty().withMessage('Bookmark title is required'),
  body('timestamp').optional().isInt({ min: 0 }).withMessage('Timestamp must be a positive integer')
], validate, addBookmark);

router.post('/material/:materialId/rate', [
  param('materialId').isMongoId().withMessage('Invalid material ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().isLength({ max: 500 }).withMessage('Feedback cannot exceed 500 characters')
], validate, rateMaterial);

// Course progress routes
router.get('/course/:courseId', [
  param('courseId').isMongoId().withMessage('Invalid course ID')
], validate, getCourseProgress);

// Student progress routes
router.get('/student/overview', getStudentProgress);

// Progress tracking dashboard routes (lecturer only)
router.get('/courses', authorize('lecturer'), getCoursesProgress);
router.get('/materials', authorize('lecturer'), getMaterialsProgress);
router.get('/tasks', authorize('lecturer'), getTasksProgress);

// Course-specific progress routes
router.get('/course/:courseId/students', [
  param('courseId').isMongoId().withMessage('Invalid course ID')
], validate, authorize('lecturer'), getCourseStudents);

router.get('/course/:courseId/materials', [
  param('courseId').isMongoId().withMessage('Invalid course ID')
], validate, authorize('lecturer'), getCourseMaterials);

// Student-specific progress routes
router.get('/student/:studentId/course/:courseId', [
  param('studentId').isMongoId().withMessage('Invalid student ID'),
  param('courseId').isMongoId().withMessage('Invalid course ID')
], validate, authorize('lecturer'), getStudentProgressDetail);

router.get('/student/:studentId/course/:courseId/materials', [
  param('studentId').isMongoId().withMessage('Invalid student ID'),
  param('courseId').isMongoId().withMessage('Invalid course ID')
], validate, authorize('lecturer'), getStudentMaterials);

router.get('/student/:studentId/course/:courseId/assignments', [
  param('studentId').isMongoId().withMessage('Invalid student ID'),
  param('courseId').isMongoId().withMessage('Invalid course ID')
], validate, authorize('lecturer'), getStudentAssignments);

module.exports = router;
