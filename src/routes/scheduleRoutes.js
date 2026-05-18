'use strict';

const express = require('express');
const router = express.Router();

const scheduleController = require('../controllers/scheduleController');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @openapi
 * tags:
 *   name: Schedule
 *   description: Real Interview Scheduling (after passing AI interview)
 */

// ─── RECRUITER ROUTES ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/schedule:
 *   post:
 *     tags: [Schedule]
 *     summary: Schedule a real interview for a seeker who passed the AI interview (Recruiter only)
 *     description: |
 *       After reviewing the AI interview report and marking the seeker as "passed",
 *       the recruiter schedules a real interview with a date, location/link, and optional notes.
 *       The seeker is notified via in-app notification AND email.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [interview_id, scheduled_at]
 *             properties:
 *               interview_id:
 *                 type: integer
 *                 description: ID of the AI interview that was marked as "passed"
 *                 example: 5
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *                 description: Date and time of the real interview (ISO 8601)
 *                 example: "2026-06-01T10:00:00.000Z"
 *               location:
 *                 type: string
 *                 description: Physical location or video call link
 *                 example: "https://meet.google.com/abc-xyz or Office Room 3"
 *               notes:
 *                 type: string
 *                 description: Any additional notes for the seeker
 *                 example: "Please bring your portfolio. Interview is with the CTO."
 *     responses:
 *       201:
 *         description: Interview scheduled — seeker notified via app + email
 *       400:
 *         description: Interview not in passed state / missing fields
 *       404:
 *         description: Interview not found
 *       409:
 *         description: Already scheduled
 */
router.post('/', protect, authorize('recruiter'), scheduleController.scheduleInterview);

/**
 * @openapi
 * /api/schedule:
 *   get:
 *     tags: [Schedule]
 *     summary: Get all interviews scheduled by this recruiter (Recruiter only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of scheduled interviews with seeker info
 */
router.get('/', protect, authorize('recruiter'), scheduleController.getRecruiterSchedules);

/**
 * @openapi
 * /api/schedule/{id}:
 *   patch:
 *     tags: [Schedule]
 *     summary: Update a scheduled interview's date, location, or notes (Recruiter only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduled_at: { type: string, format: date-time }
 *               location:     { type: string }
 *               notes:        { type: string }
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, completed]
 *     responses:
 *       200:
 *         description: Schedule updated — seeker notified
 *       403:
 *         description: Not your schedule
 *       404:
 *         description: Schedule not found
 */
router.patch('/:id', protect, authorize('recruiter'), scheduleController.updateSchedule);

/**
 * @openapi
 * /api/schedule/{id}:
 *   delete:
 *     tags: [Schedule]
 *     summary: Cancel a scheduled interview (Recruiter only)
 *     description: Marks the schedule as cancelled and sends notification + cancellation email to the seeker.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, example: "Position has been filled." }
 *     responses:
 *       200:
 *         description: Schedule cancelled — seeker notified via app + email
 *       400:
 *         description: Already cancelled
 *       403:
 *         description: Not your schedule
 */
router.delete('/:id', protect, authorize('recruiter'), scheduleController.cancelSchedule);

// ─── SEEKER ROUTES ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/schedule/my-schedule:
 *   get:
 *     tags: [Schedule]
 *     summary: Get seeker's own scheduled real interviews (Seeker only)
 *     description: Returns all real interview appointments scheduled for the seeker, with track, date, location, and recruiter info.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of scheduled interviews for the seeker
 */
router.get('/my-schedule', protect, authorize('seeker'), scheduleController.getMySchedule);

module.exports = router;
