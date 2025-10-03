const express = require('express');
const router = express.Router();
const {
  initializeMaterialReading,
  startPageReading,
  updatePageTime,
  completePage,
  getReadingProgress,
  canDownloadMaterial,
  getPageProgress
} = require('../controllers/materialPageProgressController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Initialize material reading session
router.post('/:materialId/initialize', initializeMaterialReading);

// Start reading a specific page
router.post('/:materialId/pages/:pageNumber/start', startPageReading);

// Update page reading time
router.put('/:materialId/pages/:pageNumber/time', updatePageTime);

// Complete a page
router.post('/:materialId/pages/:pageNumber/complete', completePage);

// Get overall reading progress
router.get('/:materialId/progress', getReadingProgress);

// Check if student can download material
router.get('/:materialId/can-download', canDownloadMaterial);

// Get specific page progress
router.get('/:materialId/pages/:pageNumber/progress', getPageProgress);

module.exports = router;
