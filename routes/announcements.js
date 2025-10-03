const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementsByCourse,
  getAnnouncement,
  getAnnouncementWithComments,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');

const router = express.Router();

const announcementValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('body')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),
  body('courseId')
    .isMongoId()
    .withMessage('Invalid course ID'),
  body('isImportant')
    .optional()
    .isBoolean()
    .withMessage('isImportant must be a boolean')
];

const updateAnnouncementValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('body')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),
  body('isImportant')
    .optional()
    .isBoolean()
    .withMessage('isImportant must be a boolean')
];

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID')
];

const courseIdValidation = [
  param('courseId')
    .isMongoId()
    .withMessage('Invalid course ID')
];

router.use(protect);

router.get('/', getAllAnnouncements);
router.post('/', authorize('lecturer'), announcementValidation, validate, createAnnouncement);
router.get('/:courseId', courseIdValidation, validate, getAnnouncementsByCourse);
router.get('/detail/:id', idValidation, validate, getAnnouncement);
router.get('/:id/with-comments', idValidation, validate, getAnnouncementWithComments);
router.put('/:id', authorize('lecturer'), idValidation, updateAnnouncementValidation, validate, updateAnnouncement);
router.delete('/:id', authorize('lecturer'), idValidation, validate, deleteAnnouncement);

module.exports = router; 