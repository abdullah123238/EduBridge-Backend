const Course = require('../models/Course');
const User = require('../models/User');
const Announcement = require('../models/Announcement');
const Material = require('../models/Material');

const createCourse = async (req, res, next) => {
  try {
    const { title, code, description } = req.body;
    const existingCourse = await Course.findOne({ code });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course with this code already exists'
      });
    }
    const course = await Course.create({
      title,
      code,
      description,
      lecturer: req.user.id
    });

    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { createdCourses: course._id } }
    );

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    next(error);
  }
};

const getCourses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    let query = { isActive: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query)
      .populate('lecturer', 'name email')
      .populate('students', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};
const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('lecturer', 'name email')
      .populate('students', 'name email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

const getCourseDetails = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    
    const course = await Course.findById(courseId)
      .populate('lecturer', 'name email')
      .populate('students', 'name email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const announcements = await Announcement.find({ course: courseId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);
    const materials = await Material.find({ course: courseId })
      .populate('uploadedBy', 'name')
      .sort({ uploadedAt: -1 });

    const materialsByCategory = materials.reduce((acc, material) => {
      const category = material.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(material);
      return acc;
    }, {});

    const stats = {
      totalStudents: course.students.length,
      totalAnnouncements: await Announcement.countDocuments({ course: courseId }),
      totalMaterials: materials.length,
      materialsByCategory: Object.keys(materialsByCategory).length
    };

    res.status(200).json({
      success: true,
      data: {
        course,
        announcements,
        materials: materialsByCategory,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const { title, code, description } = req.body;

    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.lecturer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    if (code && code !== course.code) {
      const existingCourse = await Course.findOne({ code });
      if (existingCourse) {
        return res.status(400).json({
          success: false,
          message: 'Course with this code already exists'
        });
      }
    }

    course = await Course.findByIdAndUpdate(
      req.params.id,
      { title, code, description },
      { new: true, runValidators: true }
    ).populate('lecturer', 'name email');

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.lecturer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course'
      });
    }

    await Course.findByIdAndUpdate(req.params.id, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getUserCourses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    let query = { isActive: true };

    if (req.user.role === 'lecturer') {
      query.lecturer = req.user.id;
    } else {
      query.students = req.user.id;
    }

    const courses = await Course.find(query)
      .populate('lecturer', 'name email')
      .populate('students', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};
const enrollInCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    if (course.students.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    await Course.findByIdAndUpdate(
      req.params.id,
      { $push: { students: req.user.id } }
    );

    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { enrolledCourses: req.params.id } }
    );

    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in course'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCourse,
  getCourses,
  getUserCourses,
  getCourse,
  getCourseDetails,
  updateCourse,
  deleteCourse,
  enrollInCourse
}; 