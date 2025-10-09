const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createCourse,
  getCourses,
  getUserCourses,
  getPublicCourses,
  getCourse,
  getCourseDetails,
  updateCourse,
  deleteCourse,
  enrollInCourse
} = require('../controllers/courseController');

const router = express.Router();

const courseValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('code')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Course code must be between 2 and 20 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
];

const courseIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid course ID')
];

// Public route for browsing courses (no authentication required)
router.get('/public', getPublicCourses);

router.use(protect);

router.post('/', authorize('lecturer'), courseValidation, validate, createCourse);
router.get('/', getCourses);
router.get('/user/my-courses', getUserCourses);
router.get('/:id', courseIdValidation, validate, getCourse);
router.get('/:id/details', courseIdValidation, validate, getCourseDetails);
router.put('/:id', authorize('lecturer'), courseIdValidation, courseValidation, validate, updateCourse);
router.delete('/:id', authorize('lecturer'), courseIdValidation, validate, deleteCourse);
router.post('/:id/enroll', authorize('student'), courseIdValidation, validate, enrollInCourse);

module.exports = router; 
