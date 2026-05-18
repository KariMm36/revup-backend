'use strict';

const express = require('express');
const router = express.Router();

const interviewController = require('../controllers/interviewController');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { startRules, submitRules, decisionRules } = require('../validators/interviewValidators');
const rateLimit = require('express-rate-limit');

// ── Rate Limiters for AI endpoints (expensive calls) ─────────────────────────
const startLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many interview attempts. You can start up to 5 interviews per hour. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many submissions. You can submit up to 5 interviews per hour. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * tags:
 *   name: Interview
 *   description: AI-Powered Interview Agent (Track-based)
 */

// ─── SEEKER ROUTES ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/interview/start:
 *   post:
 *     tags: [Interview]
 *     summary: Start an AI interview session (Seeker only)
 *     description: Sends a track to the AI service and returns MCQ + written questions. Saves the session to DB.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [track]
 *             properties:
 *               track:
 *                 type: string
 *                 enum: [Frontend, Backend, AI Engineering, Data Engineering]
 *                 example: Backend
 *     responses:
 *       201:
 *         description: Interview started — returns interview_id and questions
 *       400:
 *         description: Invalid track
 *       502:
 *         description: AI service unavailable
 */
router.post('/start', protect, authorize('seeker'), startLimiter, startRules, validate, interviewController.startInterview);

/**
 * @openapi
 * /api/interview/submit:
 *   post:
 *     tags: [Interview]
 *     summary: Submit answers for an AI interview (Seeker only)
 *     description: Sends answers to the AI for grading, saves the full report to DB, and notifies recruiters.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [interview_id, mcq_answers, written_answers]
 *             properties:
 *               interview_id:
 *                 type: integer
 *                 example: 1
 *               mcq_answers:
 *                 type: object
 *                 additionalProperties: { type: string }
 *                 example: { "1": "REST is stateless", "2": "SQL" }
 *               written_answers:
 *                 type: object
 *                 additionalProperties: { type: string }
 *                 example: { "0": "I would use microservices because..." }
 *     responses:
 *       200:
 *         description: Interview graded — returns score and full report
 *       400:
 *         description: Already submitted
 *       403:
 *         description: Not your interview
 *       502:
 *         description: AI grading service unavailable
 */
router.post('/submit', protect, authorize('seeker'), submitLimiter, submitRules, validate, interviewController.submitInterview);

/**
 * @openapi
 * /api/interview/my-history:
 *   get:
 *     tags: [Interview]
 *     summary: Get seeker's own interview history (summary list)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of past interviews (track, status, score)
 */
router.get('/my-history', protect, authorize('seeker'), interviewController.getMyInterviews);

/**
 * @openapi
 * /api/interview/my-history/{id}:
 *   get:
 *     tags: [Interview]
 *     summary: Get full detail of one of seeker's interviews (with questions + report)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Full interview detail
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
 *     summary: View all interview results for a specific seeker (Recruiter only)
 *     description: Returns the seeker's profile and all their AI interview sessions with full reports and scores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seekerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Seeker info + interview history with full reports
 *       404:
 *         description: Seeker not found
 */
router.get('/applicant/:seekerId', protect, authorize('recruiter'), interviewController.getApplicantInterview);

/**
 * @openapi
 * /api/interview/{id}/decision:
 *   patch:
 *     tags: [Interview]
 *     summary: Make a pass/fail decision on a submitted interview (Recruiter only)
 *     description: |
 *       Recruiter reviews the AI report and decides if the applicant passes to the scheduled interview stage.
 *       - **passed**: Seeker is notified and moves to scheduling
 *       - **failed**: Seeker is notified of rejection
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
 *         description: Decision recorded and seeker notified
 *       400:
 *         description: Interview not in submitted state
 *       404:
 *         description: Interview not found
 */
router.patch('/:id/decision', protect, authorize('recruiter'), decisionRules, validate, interviewController.makeDecision);

module.exports = router;
