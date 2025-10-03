const MaterialPageProgress = require('../models/MaterialPageProgress');
const Material = require('../models/Material');
const Course = require('../models/Course');

// Initialize material reading session
const initializeMaterialReading = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const { totalPages } = req.body;

    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    const course = await Course.findById(material.course);
    const isEnrolled = course.students.includes(req.user.id);
    const isLecturer = course.lecturer.toString() === req.user.id;

    if (!isEnrolled && !isLecturer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to read this material'
      });
    }

    // Check if progress already exists
    let progress = await MaterialPageProgress.findOne({
      student: req.user.id,
      material: materialId
    });

    if (!progress) {
      // Create new progress entry
      progress = await MaterialPageProgress.create({
        student: req.user.id,
        material: materialId,
        course: material.course,
        totalPages: totalPages || 1,
        currentPage: 1,
        pages: []
      });
    }

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

// Start reading a specific page
const startPageReading = async (req, res, next) => {
  try {
    const { materialId, pageNumber } = req.params;

    const progress = await MaterialPageProgress.findOne({
      student: req.user.id,
      material: materialId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Reading progress not found. Please initialize reading session first.'
      });
    }

    // Check if student can navigate to this page
    if (!progress.canNavigateToPage(parseInt(pageNumber))) {
      return res.status(403).json({
        success: false,
        message: 'You must complete previous pages before accessing this page'
      });
    }

    await progress.startPageReading(parseInt(pageNumber));

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

// Update page reading time
const updatePageTime = async (req, res, next) => {
  try {
    const { materialId, pageNumber } = req.params;
    const { timeSpent } = req.body;

    const progress = await MaterialPageProgress.findOne({
      student: req.user.id,
      material: materialId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Reading progress not found'
      });
    }

    await progress.updatePageTime(parseInt(pageNumber), timeSpent);

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

// Complete a page
const completePage = async (req, res, next) => {
  try {
    const { materialId, pageNumber } = req.params;

    const progress = await MaterialPageProgress.findOne({
      student: req.user.id,
      material: materialId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Reading progress not found'
      });
    }

    const page = progress.pages.find(p => p.pageNumber === parseInt(pageNumber));
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found in progress'
      });
    }

    // Check if minimum time requirement is met
    if (page.timeSpent < page.minTimeRequired) {
      return res.status(400).json({
        success: false,
        message: `You must spend at least ${Math.ceil(page.minTimeRequired / 60)} minutes on this page before completing it`
      });
    }

    await progress.completePage(parseInt(pageNumber));

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

// Get reading progress
const getReadingProgress = async (req, res, next) => {
  try {
    const { materialId } = req.params;

    const progress = await MaterialPageProgress.findOne({
      student: req.user.id,
      material: materialId
    });

    if (!progress) {
      // Return default progress when none exists
      const defaultProgress = {
        completedPages: 0,
        totalPages: 1,
        progressPercentage: 0,
        totalTimeSpent: 0,
        canDownload: false,
        currentPage: 1,
        pages: []
      };

      return res.status(200).json({
        success: true,
        data: defaultProgress
      });
    }

    const readingData = progress.getReadingProgress();

    res.status(200).json({
      success: true,
      data: readingData
    });
  } catch (error) {
    next(error);
  }
};

// Check if student can download material
const canDownloadMaterial = async (req, res, next) => {
  try {
    const { materialId } = req.params;

    const progress = await MaterialPageProgress.findOne({
      student: req.user.id,
      material: materialId
    });

    if (!progress) {
      return res.status(200).json({
        success: true,
        data: {
          canDownload: false,
          reason: 'Reading progress not found'
        }
      });
    }

    const readingData = progress.getReadingProgress();

    res.status(200).json({
      success: true,
      data: {
        canDownload: readingData.canDownload,
        progress: readingData,
        reason: readingData.canDownload ? 
          'All pages completed successfully' : 
          `${readingData.completedPages}/${readingData.totalPages} pages completed`
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get detailed page progress
const getPageProgress = async (req, res, next) => {
  try {
    const { materialId, pageNumber } = req.params;

    const progress = await MaterialPageProgress.findOne({
      student: req.user.id,
      material: materialId
    });

    if (!progress) {
      // Return default page progress when none exists
      const defaultPageProgress = {
        pageNumber: parseInt(pageNumber),
        timeSpent: 0,
        isCompleted: false,
        canProceed: false,
        minTimeRequired: 360, // 6 minutes
        maxTimeAllowed: 720,  // 12 minutes
        startTime: null,
        endTime: null
      };

      return res.status(200).json({
        success: true,
        data: defaultPageProgress
      });
    }

    const page = progress.pages.find(p => p.pageNumber === parseInt(pageNumber));

    if (!page) {
      // Return default page progress for this specific page
      const defaultPageProgress = {
        pageNumber: parseInt(pageNumber),
        timeSpent: 0,
        isCompleted: false,
        canProceed: false,
        minTimeRequired: 360, // 6 minutes
        maxTimeAllowed: 720,  // 12 minutes
        startTime: null,
        endTime: null
      };

      return res.status(200).json({
        success: true,
        data: defaultPageProgress
      });
    }

    res.status(200).json({
      success: true,
      data: {
        pageNumber: page.pageNumber,
        timeSpent: page.timeSpent,
        isCompleted: page.isCompleted,
        canProceed: page.canProceed,
        minTimeRequired: page.minTimeRequired,
        maxTimeAllowed: page.maxTimeAllowed,
        startTime: page.startTime,
        endTime: page.endTime
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initializeMaterialReading,
  startPageReading,
  updatePageTime,
  completePage,
  getReadingProgress,
  canDownloadMaterial,
  getPageProgress
};

