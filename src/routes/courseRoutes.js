'use strict';

const express = require('express');
const router  = express.Router();

const courseController = require('../controllers/courseController');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @openapi
 * tags:
 *   name: Courses
 *   description: 🎓 Learning Courses — Browse, Enroll & Track Progress
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC — No auth required
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/courses:
 *   get:
 *     tags: [Courses]
 *     summary: Get all published courses
 *     security: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by category
 *       - in: query
 *         name: level
 *         schema: { type: string, enum: [beginner, intermediate, advanced] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by title
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of published courses with pagination
 */
router.get('/', courseController.getAllCourses);

/**
 * @openapi
 * /api/courses/my-enrollments:
 *   get:
 *     tags: [Courses]
 *     summary: Get all courses the current user is enrolled in (with progress %)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enrolled courses with progress percentage
 *       401:
 *         description: Unauthorized
 */
router.get('/my-enrollments', protect, courseController.getMyEnrollments);

/**
 * @openapi
 * /api/courses/admin/all:
 *   get:
 *     tags: [Courses]
 *     summary: Admin — Get ALL courses including drafts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All courses (published + draft)
 *       403:
 *         description: Admin only
 */
router.get('/admin/all', protect, authorize('admin'), courseController.adminGetAllCourses);

/**
 * @openapi
 * /api/courses/{id}:
 *   get:
 *     tags: [Courses]
 *     summary: Get a single published course with its lessons
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Course details including lessons list
 *       404:
 *         description: Course not found
 */
router.get('/:id', courseController.getCourse);

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED USER — Enrollment & Progress
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/courses/{id}/enroll:
 *   post:
 *     tags: [Courses]
 *     summary: Enroll in a course (any logged-in user)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         description: Enrolled successfully
 *       409:
 *         description: Already enrolled
 *       404:
 *         description: Course not found
 */
router.post('/:id/enroll', protect, courseController.enrollCourse);

/**
 * @openapi
 * /api/courses/{courseId}/my-progress:
 *   get:
 *     tags: [Courses]
 *     summary: Get current user's progress in a specific course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Progress percentage and per-lesson completion status
 *       403:
 *         description: Not enrolled
 */
router.get('/:courseId/my-progress', protect, courseController.getCourseProgress);

/**
 * @openapi
 * /api/courses/{courseId}/lessons/{lessonId}/complete:
 *   patch:
 *     tags: [Courses]
 *     summary: Mark a lesson as complete
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lesson marked complete, returns updated progress %
 *       403:
 *         description: Not enrolled in course
 *       404:
 *         description: Lesson not found
 */
router.patch('/:courseId/lessons/:lessonId/complete', protect, courseController.completeLesson);

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — Course & Lesson CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/courses:
 *   post:
 *     tags: [Courses]
 *     summary: Admin — Create a new course
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category]
 *             properties:
 *               title:            { type: string, example: Introduction to Node.js }
 *               description:      { type: string, example: Learn Node.js from scratch }
 *               thumbnail:        { type: string, example: https://example.com/thumb.jpg }
 *               category:         { type: string, example: Backend Development }
 *               level:            { type: string, enum: [beginner, intermediate, advanced], example: beginner }
 *               status:           { type: string, enum: [draft, published], example: draft }
 *     responses:
 *       201:
 *         description: Course created
 *       403:
 *         description: Admin only
 */
router.post('/', protect, authorize('admin'), courseController.createCourse);

/**
 * @openapi
 * /api/courses/{id}:
 *   put:
 *     tags: [Courses]
 *     summary: Admin — Update a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:       { type: string }
 *               description: { type: string }
 *               thumbnail:   { type: string }
 *               category:    { type: string }
 *               level:       { type: string, enum: [beginner, intermediate, advanced] }
 *               status:      { type: string, enum: [draft, published] }
 *     responses:
 *       200:
 *         description: Course updated
 *   delete:
 *     tags: [Courses]
 *     summary: Admin — Delete a course (cascades lessons, enrollments, progress)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Course deleted
 */
router.put('/:id',    protect, authorize('admin'), courseController.updateCourse);
router.delete('/:id', protect, authorize('admin'), courseController.deleteCourse);

/**
 * @openapi
 * /api/courses/{id}/lessons:
 *   post:
 *     tags: [Courses]
 *     summary: Admin — Add a lesson to a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, youtube_url]
 *             properties:
 *               title:            { type: string, example: "What is Node.js?" }
 *               youtube_url:      { type: string, example: "https://www.youtube.com/watch?v=fBNz5xF-Kx4" }
 *               duration_minutes: { type: integer, example: 15 }
 *               order:            { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: Lesson added
 *       404:
 *         description: Course not found
 */
router.post('/:id/lessons', protect, authorize('admin'), courseController.addLesson);

/**
 * @openapi
 * /api/courses/{id}/lessons/{lessonId}:
 *   put:
 *     tags: [Courses]
 *     summary: Admin — Update a lesson
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Course ID
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:            { type: string }
 *               youtube_url:      { type: string }
 *               duration_minutes: { type: integer }
 *               order:            { type: integer }
 *     responses:
 *       200:
 *         description: Lesson updated
 *   delete:
 *     tags: [Courses]
 *     summary: Admin — Delete a lesson
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Course ID
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lesson deleted
 */
router.put('/:id/lessons/:lessonId',    protect, authorize('admin'), courseController.updateLesson);
router.delete('/:id/lessons/:lessonId', protect, authorize('admin'), courseController.deleteLesson);

module.exports = router;
