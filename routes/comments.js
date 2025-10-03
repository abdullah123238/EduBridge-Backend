const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  addComment,
  getComments,
  updateComment,
  deleteComment
} = require('../controllers/commentController');

const router = express.Router();

const commentValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID')
];

const announcementIdValidation = [
  param('announcementId')
    .isMongoId()
    .withMessage('Invalid announcement ID')
];

router.use(protect);

router.post('/:announcementId', announcementIdValidation, commentValidation, validate, addComment);
router.get('/:announcementId', announcementIdValidation, validate, getComments);
router.put('/:id', idValidation, commentValidation, validate, updateComment);
router.delete('/:id', idValidation, validate, deleteComment);

module.exports = router; 