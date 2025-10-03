const ProgressTracking = require('../models/ProgressTracking');
const Material = require('../models/Material');
const Course = require('../models/Course');
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const User = require('../models/User');

// Get progress for a specific material
const getMaterialProgress = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const studentId = req.user.id;

    let progress = await ProgressTracking.findOne({
      student: studentId,
      material: materialId
    }).populate('material', 'title fileType fileSize');

    if (!progress) {
      // Create initial progress tracking
      const material = await Material.findById(materialId);
      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material not found'
        });
      }

      progress = await ProgressTracking.create({
        student: studentId,
        material: materialId,
        course: material.course,
        status: 'not_started',
        progressPercentage: 0,
        timeSpent: 0,
        lastAccessed: new Date()
      });

      await progress.populate('material', 'title fileType fileSize');
    }

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

// Update material progress
const updateMaterialProgress = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const studentId = req.user.id;
    const { progressPercentage, timeSpent, watchTime, interaction } = req.body;

    let progress = await ProgressTracking.findOne({
      student: studentId,
      material: materialId
    });

    if (!progress) {
      const material = await Material.findById(materialId);
      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material not found'
        });
      }

      progress = await ProgressTracking.create({
        student: studentId,
        material: materialId,
        course: material.course
      });
    }

    // Update progress data
    if (progressPercentage !== undefined) {
      progress.progressPercentage = Math.min(100, Math.max(0, progressPercentage));
    }
    if (timeSpent !== undefined) {
      progress.timeSpent = timeSpent;
    }
    if (watchTime !== undefined) {
      progress.watchTime = watchTime;
    }

    progress.lastAccessed = new Date();

    // Update status based on progress
    if (progress.progressPercentage >= 90) {
      progress.status = 'completed';
      progress.completionDate = new Date();
    } else if (progress.progressPercentage > 0) {
      progress.status = 'in_progress';
    }

    // Add interaction if provided
    if (interaction) {
      progress.interactions.push(interaction);
    }

    await progress.save();

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

// Get course progress overview
const getCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const progress = await ProgressTracking.find({
      student: studentId,
      course: courseId
    }).populate('material', 'title fileType category');

    const course = await Course.findById(courseId);
    const materials = await Material.find({ course: courseId });

    // Calculate overall progress
    const totalMaterials = materials.length;
    const completedMaterials = progress.filter(p => p.status === 'completed').length;
    const inProgressMaterials = progress.filter(p => p.status === 'in_progress').length;
    const notStartedMaterials = totalMaterials - completedMaterials - inProgressMaterials;

    const overallProgress = totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0;
    const totalTimeSpent = progress.reduce((sum, p) => sum + p.timeSpent, 0);

    res.status(200).json({
      success: true,
      data: {
        course: course,
        overallProgress,
        totalMaterials,
        completedMaterials,
        inProgressMaterials,
        notStartedMaterials,
        totalTimeSpent,
        materialProgress: progress
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get student's overall progress
const getStudentProgress = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const progress = await ProgressTracking.find({
      student: studentId
    }).populate('course', 'title code').populate('material', 'title fileType');

    // Group by course
    const courseProgress = {};
    progress.forEach(p => {
      const courseId = p.course._id.toString();
      if (!courseProgress[courseId]) {
        courseProgress[courseId] = {
          course: p.course,
          materials: [],
          completed: 0,
          inProgress: 0,
          notStarted: 0,
          totalTimeSpent: 0
        };
      }
      
      courseProgress[courseId].materials.push(p);
      courseProgress[courseId].totalTimeSpent += p.timeSpent;
      
      if (p.status === 'completed') courseProgress[courseId].completed++;
      else if (p.status === 'in_progress') courseProgress[courseId].inProgress++;
      else courseProgress[courseId].notStarted++;
    });

    // Calculate overall statistics
    const totalMaterials = progress.length;
    const completedMaterials = progress.filter(p => p.status === 'completed').length;
    const totalTimeSpent = progress.reduce((sum, p) => sum + p.timeSpent, 0);
    const averageProgress = totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        overallStats: {
          totalMaterials,
          completedMaterials,
          averageProgress,
          totalTimeSpent
        },
        courseProgress: Object.values(courseProgress)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add note to material progress
const addNote = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const studentId = req.user.id;
    const { content, timestamp } = req.body;

    let progress = await ProgressTracking.findOne({
      student: studentId,
      material: materialId
    });

    if (!progress) {
      const material = await Material.findById(materialId);
      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material not found'
        });
      }

      progress = await ProgressTracking.create({
        student: studentId,
        material: materialId,
        course: material.course
      });
    }

    progress.notes.push({
      content,
      timestamp: timestamp || 0,
      createdAt: new Date()
    });

    await progress.save();

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

// Add bookmark to material progress
const addBookmark = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const studentId = req.user.id;
    const { title, timestamp } = req.body;

    let progress = await ProgressTracking.findOne({
      student: studentId,
      material: materialId
    });

    if (!progress) {
      const material = await Material.findById(materialId);
      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material not found'
        });
      }

      progress = await ProgressTracking.create({
        student: studentId,
        material: materialId,
        course: material.course
      });
    }

    progress.bookmarks.push({
      title,
      timestamp: timestamp || 0,
      createdAt: new Date()
    });

    await progress.save();

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

// Rate material
const rateMaterial = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const studentId = req.user.id;
    const { rating, feedback } = req.body;

    let progress = await ProgressTracking.findOne({
      student: studentId,
      material: materialId
    });

    if (!progress) {
      const material = await Material.findById(materialId);
      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material not found'
        });
      }

      progress = await ProgressTracking.create({
        student: studentId,
        material: materialId,
        course: material.course
      });
    }

    progress.rating = rating;
    progress.feedback = feedback;

    await progress.save();

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

// Get all courses progress for lecturer dashboard
const getCoursesProgress = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const lecturerId = req.user.id;

    // Get courses taught by the lecturer
    const courses = await Course.find({ lecturer: lecturerId })
      .populate('lecturer', 'name email')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const coursesWithProgress = await Promise.all(
      courses.map(async (course) => {
        // Get all materials for this course
        const materials = await Material.find({ course: course._id });
        const totalMaterials = materials.length;

        // Get all progress for this course
        const progress = await ProgressTracking.find({ course: course._id });
        
        // Calculate statistics
        const completedMaterials = progress.filter(p => p.status === 'completed').length;
        const totalStudents = [...new Set(progress.map(p => p.student.toString()))].length;
        const averageProgress = totalMaterials > 0 ? (completedMaterials / (totalMaterials * totalStudents)) * 100 : 0;

        // Get assignments for this course
        const assignments = await Task.find({ course: course._id });
        const submissions = await Submission.find({ 
          task: { $in: assignments.map(a => a._id) } 
        });

        return {
          _id: course._id,
          title: course.title,
          code: course.code,
          totalStudents,
          totalMaterials,
          completedMaterials,
          averageProgress: Math.round(averageProgress),
          totalAssignments: assignments.length,
          submittedAssignments: submissions.length,
          activeStudents: totalStudents,
          excellentStudents: Math.round(totalStudents * 0.2),
          goodStudents: Math.round(totalStudents * 0.3),
          atRiskStudents: Math.round(totalStudents * 0.1)
        };
      })
    );

    res.status(200).json({
      success: true,
      data: coursesWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: coursesWithProgress.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all materials progress for lecturer dashboard
const getMaterialsProgress = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const lecturerId = req.user.id;

    // Get courses taught by the lecturer
    const courses = await Course.find({ lecturer: lecturerId });
    const courseIds = courses.map(c => c._id);

    // Get materials from lecturer's courses
    const materials = await Material.find({ course: { $in: courseIds } })
      .populate('course', 'title code')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const materialsWithProgress = await Promise.all(
      materials.map(async (material) => {
        // Get all progress for this material
        const progress = await ProgressTracking.find({ material: material._id });
        
        const totalStudents = progress.length;
        const completedStudents = progress.filter(p => p.status === 'completed').length;
        const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0;
        const averageTimeSpent = totalStudents > 0 ? 
          progress.reduce((sum, p) => sum + p.timeSpent, 0) / totalStudents : 0;

        const lastAccessed = progress.length > 0 ? 
          new Date(Math.max(...progress.map(p => new Date(p.lastAccessed)))) : null;

        return {
          _id: material._id,
          title: material.title,
          courseTitle: material.course.title,
          type: material.fileType,
          totalStudents,
          completedStudents,
          completionRate: Math.round(completionRate),
          averageTimeSpent: Math.round(averageTimeSpent),
          lastAccessed
        };
      })
    );

    res.status(200).json({
      success: true,
      data: materialsWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: materialsWithProgress.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all tasks progress for lecturer dashboard
const getTasksProgress = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const lecturerId = req.user.id;

    // Get courses taught by the lecturer
    const courses = await Course.find({ lecturer: lecturerId });
    const courseIds = courses.map(c => c._id);

    // Get tasks from lecturer's courses
    const tasks = await Task.find({ course: { $in: courseIds } })
      .populate('course', 'title code')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const tasksWithProgress = await Promise.all(
      tasks.map(async (task) => {
        // Get submissions for this task
        const submissions = await Submission.find({ task: task._id });
        
        const totalSubmissions = submissions.length;
        const gradedSubmissions = submissions.filter(s => s.status === 'graded').length;
        const averageScore = gradedSubmissions > 0 ? 
          submissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions : 0;
        
        const submissionRate = 100; // This would need to be calculated based on enrolled students

        return {
          _id: task._id,
          title: task.title,
          courseTitle: task.course.title,
          dueDate: task.dueDate,
          maxPoints: task.maxPoints,
          status: task.status,
          priority: task.priority,
          totalSubmissions,
          gradedSubmissions,
          averageScore: Math.round(averageScore),
          submissionRate: Math.round(submissionRate)
        };
      })
    );

    res.status(200).json({
      success: true,
      data: tasksWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: tasksWithProgress.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get course students progress
const getCourseStudents = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Get enrolled students for this course
    const course = await Course.findById(courseId).populate('enrolledStudents', 'name email');
    const students = course.enrolledStudents;

    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        // Get progress for this student in this course
        const progress = await ProgressTracking.find({ 
          student: student._id, 
          course: courseId 
        });

        const totalMaterials = progress.length;
        const completedMaterials = progress.filter(p => p.status === 'completed').length;
        const studentProgress = totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0;
        const totalTimeSpent = progress.reduce((sum, p) => sum + p.timeSpent, 0);

        // Get assignments for this student
        const assignments = await Task.find({ course: courseId });
        const submissions = await Submission.find({ 
          student: student._id,
          task: { $in: assignments.map(a => a._id) }
        });

        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          progress: Math.round(studentProgress),
          totalMaterials,
          completedMaterials,
          submittedAssignments: submissions.length,
          totalAssignments: assignments.length,
          totalTimeSpent: Math.round(totalTimeSpent / 60), // Convert to hours
          averageTimePerSession: Math.round(totalTimeSpent / Math.max(1, progress.length))
        };
      })
    );

    res.status(200).json({
      success: true,
      data: studentsWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: studentsWithProgress.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get course materials progress
const getCourseMaterials = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Get materials for this course
    const materials = await Material.find({ course: courseId })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const materialsWithProgress = await Promise.all(
      materials.map(async (material) => {
        // Get all progress for this material
        const progress = await ProgressTracking.find({ material: material._id });
        
        const totalStudents = progress.length;
        const completedStudents = progress.filter(p => p.status === 'completed').length;
        const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0;
        const averageTimeSpent = totalStudents > 0 ? 
          progress.reduce((sum, p) => sum + p.timeSpent, 0) / totalStudents : 0;

        const lastAccessed = progress.length > 0 ? 
          new Date(Math.max(...progress.map(p => new Date(p.lastAccessed)))) : null;

        return {
          _id: material._id,
          title: material.title,
          type: material.fileType,
          totalStudents,
          completedStudents,
          completionRate: Math.round(completionRate),
          averageTimeSpent: Math.round(averageTimeSpent),
          lastAccessed
        };
      })
    );

    res.status(200).json({
      success: true,
      data: materialsWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: materialsWithProgress.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get individual student progress detail
const getStudentProgressDetail = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.params;

    const student = await User.findById(studentId);
    const course = await Course.findById(courseId);

    if (!student || !course) {
      return res.status(404).json({
        success: false,
        message: 'Student or course not found'
      });
    }

    // Get progress for this student in this course
    const progress = await ProgressTracking.find({ 
      student: studentId, 
      course: courseId 
    });

    const totalMaterials = progress.length;
    const completedMaterials = progress.filter(p => p.status === 'completed').length;
    const studentProgress = totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0;
    const totalTimeSpent = progress.reduce((sum, p) => sum + p.timeSpent, 0);

    // Get assignments for this student
    const assignments = await Task.find({ course: courseId });
    const submissions = await Submission.find({ 
      student: studentId,
      task: { $in: assignments.map(a => a._id) }
    });

    const gradedSubmissions = submissions.filter(s => s.status === 'graded');
    const averageGrade = gradedSubmissions.length > 0 ? 
      gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length : 0;

    res.status(200).json({
      success: true,
      data: {
        _id: student._id,
        name: student.name,
        email: student.email,
        courseTitle: course.title,
        progress: Math.round(studentProgress),
        totalMaterials,
        completedMaterials,
        submittedAssignments: submissions.length,
        totalAssignments: assignments.length,
        totalTimeSpent: Math.round(totalTimeSpent / 60), // Convert to hours
        averageTimePerSession: Math.round(totalTimeSpent / Math.max(1, progress.length)),
        averageGrade: Math.round(averageGrade),
        totalPointsEarned: gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0),
        lastActivity: progress.length > 0 ? 
          new Date(Math.max(...progress.map(p => new Date(p.lastAccessed)))) : null,
        streakDays: 7, // This would need to be calculated
        sessionsThisWeek: progress.length, // This would need to be calculated
        enrolledAt: new Date() // This would need to be tracked
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get student materials progress
const getStudentMaterials = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Get materials for this course
    const materials = await Material.find({ course: courseId })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const materialsWithProgress = await Promise.all(
      materials.map(async (material) => {
        // Get progress for this student and material
        const progress = await ProgressTracking.findOne({ 
          student: studentId, 
          material: material._id 
        });

        return {
          _id: material._id,
          title: material.title,
          type: material.fileType,
          status: progress?.status || 'not_started',
          completionPercentage: progress?.progressPercentage || 0,
          totalTimeSpent: progress?.timeSpent || 0,
          startedAt: progress?.lastAccessed || null,
          completedAt: progress?.completionDate || null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: materialsWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: materialsWithProgress.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get student assignments progress
const getStudentAssignments = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Get assignments for this course
    const assignments = await Task.find({ course: courseId })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const assignmentsWithProgress = await Promise.all(
      assignments.map(async (assignment) => {
        // Get submission for this student and assignment
        const submission = await Submission.findOne({ 
          student: studentId, 
          task: assignment._id 
        });

        return {
          _id: assignment._id,
          title: assignment.title,
          dueDate: assignment.dueDate,
          maxPoints: assignment.maxPoints,
          status: submission?.status || 'not_submitted',
          grade: submission?.grade || null,
          score: submission?.score || null,
          percentage: submission?.percentage || null,
          submittedAt: submission?.submittedAt || null,
          gradedAt: submission?.gradedAt || null,
          feedback: submission?.feedback || null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: assignmentsWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: assignmentsWithProgress.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
