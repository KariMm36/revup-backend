'use strict';

const express = require('express');
const router = express.Router();

const interviewController = require('../controllers/interviewController');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { startRules, answerRules, cheatEventRules, decisionRules } = require('../validators/interviewValidators');
const rateLimit = require('express-rate-limit');

// ── Rate Limiters ─────────────────────────────────────────────────────────────
const startLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many interview attempts. You can start up to 5 interviews per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const answerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, message: 'Too many answer submissions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * tags:
 *   name: Interview
 *   description: AI-Powered Conversational Interview Agent (Job-based)
 */

// ─── SEEKER ROUTES ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/interview/start:
 *   post:
 *     tags: [Interview]
 *     summary: Start an AI interview for a job you applied to (Seeker only)
 *     description: |
 *       Validates the seeker has applied to the job, maps to the AI platform's job,
 *       starts a conversational session, and returns the first question immediately.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [job_id]
 *             properties:
 *               job_id:
 *                 type: integer
 *                 example: 34
 *     responses:
 *       201:
 *         description: Interview started — returns interview_id and first question
 *       400:
 *         description: Already have an active interview for this job
 *       403:
 *         description: You haven't applied to this job
 *       404:
 *         description: Job not found or not available in AI system
 *       502:
 *         description: AI service unavailable
 */
router.post('/start', protect, authorize('seeker'), startLimiter, startRules, validate, interviewController.startInterview);

/**
 * @openapi
 * /api/interview/{id}/question:
 *   get:
 *     tags: [Interview]
 *     summary: Get the next question for an ongoing interview (Seeker only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Next question object { id, question_type, content, options, difficulty }
 *       400:
 *         description: Interview not in progress
 *       403:
 *         description: Not your interview
 */
router.get('/:id/question', protect, authorize('seeker'), interviewController.getNextQuestion);

/**
 * @openapi
 * /api/interview/{id}/answer:
 *   post:
 *     tags: [Interview]
 *     summary: Submit one answer and receive immediate evaluation (Seeker only)
 *     description: |
 *       Submits a single answer to the AI. Returns evaluation with score, feedback,
 *       and AI-detection probability. If this was the last question (is_complete: true),
 *       also returns the final report and notifies recruiters.
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
 *             required: [question_id, answer, time_taken_seconds]
 *             properties:
 *               question_id:
 *                 type: integer
 *                 example: 5
 *               answer:
 *                 type: string
 *                 example: "I would use dependency injection to decouple components..."
 *               time_taken_seconds:
 *                 type: integer
 *                 example: 120
 *     responses:
 *       200:
 *         description: Evaluation result, next question (if any), and completion status
 *       400:
 *         description: Interview not in progress
 *       403:
 *         description: Not your interview
 *       502:
 *         description: AI grading service unavailable
 */
router.post('/:id/answer', protect, authorize('seeker'), answerLimiter, answerRules, validate, interviewController.submitAnswer);

/**
 * @openapi
 * /api/interview/{id}/track:
 *   post:
 *     tags: [Interview]
 *     summary: Report a real-time cheating event (Seeker client)
 *     description: Called by the frontend when suspicious behavior is detected (tab switch, copy-paste, etc.)
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
 *             required: [event_type, details]
 *             properties:
 *               event_type:
 *                 type: string
 *                 example: "tab_switch"
 *               details:
 *                 type: string
 *                 example: "User switched to another tab for 5 seconds"
 *     responses:
 *       200:
 *         description: Event recorded
 */
router.post('/:id/track', protect, authorize('seeker'), cheatEventRules, validate, interviewController.trackCheatEvent);

/**
 * @openapi
 * /api/interview/my-history:
 *   get:
 *     tags: [Interview]
 *     summary: Get seeker's own interview history (paginated list)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated list of interviews
 */
router.get('/my-history', protect, authorize('seeker'), interviewController.getMyInterviews);

/**
 * @openapi
 * /api/interview/my-history/{id}:
 *   get:
 *     tags: [Interview]
 *     summary: Get full detail of one interview (with answers and report)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Full interview record
 *       403:
 *         description: Not your interview
 */
router.get('/my-history/:id', protect, authorize('seeker'), interviewController.getMyInterviewDetail);

// ─── RECRUITER ROUTES ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/interview/applicant/{seekerId}:
 *   get:
 *     tags: [Interview]
 *     summary: View all interview results for a seeker who applied to your jobs (Recruiter only)
 *     description: Returns seeker profile + all their AI interviews for your company's jobs, including full answers and reports.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seekerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Seeker info + interview results
 *       403:
 *         description: Seeker has not applied to your jobs
 *       404:
 *         description: Seeker not found
 */
router.get('/applicant/:seekerId', protect, authorize('recruiter'), interviewController.getApplicantInterview);

/**
 * @openapi
 * /api/interview/{id}/decision:
 *   patch:
 *     tags: [Interview]
 *     summary: Make a pass/fail decision on a completed interview (Recruiter only)
 *     description: |
 *       Recruiter reviews the AI report and decides if the candidate advances.
 *       - **passed**: Seeker notified, moves to scheduling stage
 *       - **failed**: Seeker notified of rejection
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
 *             required: [decision]
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [passed, failed]
 *                 example: passed
 *     responses:
 *       200:
 *         description: Decision recorded, seeker notified
 *       400:
 *         description: Interview not completed yet
 *       403:
 *         description: Not your company's interview
 *       404:
 *         description: Interview not found
 */
router.patch('/:id/decision', protect, authorize('recruiter'), decisionRules, validate, interviewController.makeDecision);

module.exports = router;
