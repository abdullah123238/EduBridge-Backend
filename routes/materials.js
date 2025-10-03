const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadSingle } = require('../middleware/upload');
const {
  uploadMaterial,
  getAllMaterials,
  getMaterialsByCourse,
  getMaterial,
  getMaterialDetails,
  updateMaterial,
  deleteMaterial,
  downloadMaterial,
  previewMaterial,
  getPdfPageCount
} = require('../controllers/materialController');

const router = express.Router();

const materialValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('courseId')
    .isMongoId()
    .withMessage('Invalid course ID'),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string')
];

const updateMaterialValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string')
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

router.get('/', getAllMaterials);
router.post('/upload', authorize('lecturer'), uploadSingle, materialValidation, validate, uploadMaterial);
router.get('/:courseId', courseIdValidation, validate, getMaterialsByCourse);
router.get('/detail/:id', idValidation, validate, getMaterial);
router.get('/:id/details', idValidation, validate, getMaterialDetails);
router.put('/:id', authorize('lecturer'), idValidation, updateMaterialValidation, validate, updateMaterial);
router.delete('/:id', authorize('lecturer'), idValidation, validate, deleteMaterial);
router.get('/download/:id', idValidation, validate, downloadMaterial);
router.get('/preview/:id', idValidation, validate, previewMaterial);
router.get('/:id/page-count', idValidation, validate, getPdfPageCount);

module.exports = router; 