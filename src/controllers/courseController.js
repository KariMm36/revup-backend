'use strict';

const { Course, Lesson, Enrollment, LessonProgress, User } = require('../models');
const { Op } = require('sequelize');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Calculate completion percentage for a user in a course
const calcProgress = async (userId, courseId) => {
  const totalLessons = await Lesson.count({ where: { course_id: courseId } });
  if (totalLessons === 0) return 0;
  const completed = await LessonProgress.count({
    where: { user_id: userId, completed: true },
    include: [{ model: Lesson, as: 'lesson', where: { course_id: courseId }, attributes: [] }],
  });
  return Math.round((completed / totalLessons) * 100);
};

// ─── PUBLIC ───────────────────────────────────────────────────────────────────

// GET /api/courses
exports.getAllCourses = async (req, res, next) => {
  try {
    const { category, level, search, page = 1, limit = 10 } = req.query;
    const where = { status: 'published' };

    if (category) where.category = category;
    if (level)    where.level    = level;
    if (search)   where.title    = { [Op.like]: `%${search}%` };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Course.findAndCountAll({
      where,
      limit:  parseInt(limit),
      offset,
      order:  [['createdAt', 'DESC']],
      include: [{ model: User, as: 'admin', attributes: ['id', 'name'] }],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/courses/:id
exports.getCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        { model: User,   as: 'admin',   attributes: ['id', 'name'] },
        { model: Lesson, as: 'lessons', order: [['order', 'ASC']] },
      ],
    });

    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (course.status === 'draft') {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Count enrollments
    const enrollmentCount = await Enrollment.count({ where: { course_id: course.id } });

    return res.status(200).json({ success: true, data: { ...course.toJSON(), enrollment_count: enrollmentCount } });
  } catch (err) {
    next(err);
  }
};

// ─── USER (Enrolled) ─────────────────────────────────────────────────────────

// POST /api/courses/:id/enroll
exports.enrollCourse = async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id);
    const userId   = req.user.id;

    const course = await Course.findByPk(courseId);
    if (!course || course.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const [enrollment, created] = await Enrollment.findOrCreate({
      where: { user_id: userId, course_id: courseId },
    });

    if (!created) {
      return res.status(409).json({ success: false, message: 'You are already enrolled in this course.' });
    }

    return res.status(201).json({ success: true, message: 'Enrolled successfully!', data: enrollment });
  } catch (err) {
    next(err);
  }
};

// GET /api/courses/my-enrollments
exports.getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Course,
        as: 'course',
        include: [{ model: Lesson, as: 'lessons', attributes: ['id'] }],
      }],
      order: [['createdAt', 'DESC']],
    });

    // Attach progress percentage to each enrollment
    const result = await Promise.all(enrollments.map(async (e) => {
      const progress = await calcProgress(req.user.id, e.course_id);
      return { ...e.toJSON(), progress_percent: progress };
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/courses/:courseId/lessons/:lessonId/complete
exports.completeLesson = async (req, res, next) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;

    // Verify enrollment
    const enrollment = await Enrollment.findOne({
      where: { user_id: userId, course_id: courseId },
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
    }

    // Verify lesson belongs to course
    const lesson = await Lesson.findOne({ where: { id: lessonId, course_id: courseId } });
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found in this course.' });

    const [progress, created] = await LessonProgress.findOrCreate({
      where:    { user_id: userId, lesson_id: lessonId },
      defaults: { completed: true, completed_at: new Date() },
    });

    if (!created && !progress.completed) {
      await progress.update({ completed: true, completed_at: new Date() });
    }

    // Check if course is fully completed
    const progressPercent = await calcProgress(userId, courseId);
    if (progressPercent === 100 && !enrollment.completed_at) {
      await enrollment.update({ completed_at: new Date() });
    }

    return res.status(200).json({
      success: true,
      message: 'Lesson marked as complete.',
      data:    { progress_percent: progressPercent },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/courses/:courseId/my-progress
exports.getCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
    }

    const lessons = await Lesson.findAll({ where: { course_id: courseId }, order: [['order', 'ASC']] });
    const progressRows = await LessonProgress.findAll({ where: { user_id: userId } });
    const completedIds = new Set(progressRows.filter(p => p.completed).map(p => p.lesson_id));

    const lessonsWithStatus = lessons.map(l => ({
      ...l.toJSON(),
      completed: completedIds.has(l.id),
    }));

    const progressPercent = await calcProgress(userId, parseInt(courseId));

    return res.status(200).json({
      success: true,
      data: {
        progress_percent: progressPercent,
        completed_at:     enrollment.completed_at,
        lessons:          lessonsWithStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────

// POST /api/courses (Admin only)
exports.createCourse = async (req, res, next) => {
  try {
    const { title, description, thumbnail, category, level, status } = req.body;

    const course = await Course.create({
      title, description, thumbnail, category,
      level:    level    || 'beginner',
      status:   status   || 'draft',
      admin_id: req.user.id,
    });

    return res.status(201).json({ success: true, message: 'Course created.', data: course });
  } catch (err) {
    next(err);
  }
};

// PUT /api/courses/:id (Admin only)
exports.updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const { title, description, thumbnail, category, level, status } = req.body;
    await course.update({ title, description, thumbnail, category, level, status });

    return res.status(200).json({ success: true, message: 'Course updated.', data: course });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/courses/:id (Admin only)
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    await course.destroy();
    return res.status(200).json({ success: true, message: 'Course deleted.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/courses/:id/lessons (Admin only)
exports.addLesson = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const { title, youtube_url, duration_minutes, order } = req.body;

    // Auto-assign next order if not provided
    const maxOrder = await Lesson.max('order', { where: { course_id: course.id } }) || 0;

    const lesson = await Lesson.create({
      course_id: course.id,
      title,
      youtube_url,
      duration_minutes: duration_minutes || null,
      order: order || maxOrder + 1,
    });

    return res.status(201).json({ success: true, message: 'Lesson added.', data: lesson });
  } catch (err) {
    next(err);
  }
};

// PUT /api/courses/:id/lessons/:lessonId (Admin only)
exports.updateLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findOne({
      where: { id: req.params.lessonId, course_id: req.params.id },
    });
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found.' });

    const { title, youtube_url, duration_minutes, order } = req.body;
    await lesson.update({ title, youtube_url, duration_minutes, order });

    return res.status(200).json({ success: true, message: 'Lesson updated.', data: lesson });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/courses/:id/lessons/:lessonId (Admin only)
exports.deleteLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findOne({
      where: { id: req.params.lessonId, course_id: req.params.id },
    });
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found.' });

    await lesson.destroy();
    return res.status(200).json({ success: true, message: 'Lesson deleted.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/courses/admin/all (Admin only — includes drafts)
exports.adminGetAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'admin', attributes: ['id', 'name'] }],
    });
    return res.status(200).json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
};
