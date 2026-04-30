'use strict';

const express = require('express');
const router = express.Router();

const applicationController = require('../controllers/applicationController');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { applyRules, updateStatusRules } = require('../validators/applicationValidators');
const { uploadResume } = require('../config/multer');

/**
 * @openapi
 * tags:
 *   name: Applications
 *   description: Application System (Role Protected)
 */

/**
 * @openapi
 * /api/applications/my-applications:
 *   get:
 *     tags: [Applications]
 *     summary: Get seeker's own application history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of applications with job details }
 */
router.get('/my-applications', protect, authorize('seeker'), applicationController.getMyApplications);

/**
 * @openapi
 * /api/applications/job/{jobId}:
 *   get:
 *     tags: [Applications]
 *     summary: Get all applicants for a specific job (Recruiter only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Applicants list }
 *       403: { description: Forbidden - Not your job }
 */
router.get('/job/:jobId', protect, authorize('recruiter'), applicationController.getJobApplications);

/**
 * @openapi
 * /api/applications/apply/{jobId}:
 *   post:
 *     tags: [Applications]
 *     summary: Apply to a job (with optional resume upload)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               cover_letter: { type: string }
 *               resume:       { type: string, format: binary }
 *     responses:
 *       201: { description: Application submitted }
 *       409: { description: Already applied }
 */
router.post('/apply/:jobId', protect, authorize('seeker'), uploadResume.single('resume'), applyRules, validate, applicationController.applyToJob);

/**
 * @openapi
 * /api/applications/{id}:
 *   get:
 *     tags: [Applications]
 *     summary: View specific application with seeker profile (Recruiter — Privacy Rule enforced)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Application detail with seeker info }
 *       403: { description: Forbidden }
 */
router.get('/:id', protect, applicationController.getApplicationById);

/**
 * @openapi
 * /api/applications/{id}:
 *   delete:
 *     tags: [Applications]
 *     summary: Seeker withdraws their application
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Application withdrawn }
 *       400: { description: Can only withdraw applied status }
 *       403: { description: Forbidden - Not your application }
 */
router.delete('/:id', protect, authorize('seeker'), applicationController.withdrawApplication);

/**
 * @openapi
 * /api/applications/{id}/status:
 *   put:
 *     tags: [Applications]
 *     summary: Update application status and trigger notification + email (Recruiter only)
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [applied, shortlisted, rejected, hired] }
 *     responses:
 *       200: { description: Status updated, notification sent }
 */
router.put('/:id/status', protect, authorize('recruiter'), updateStatusRules, validate, applicationController.updateApplicationStatus);

module.exports = router;
