'use strict';

const express = require('express');
const router = express.Router();

const jobController = require('../controllers/jobController');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createJobRules, updateJobRules } = require('../validators/jobValidators');

/**
 * @openapi
 * tags:
 *   name: Jobs
 *   description: Job Listings Engine
 */

// ⚠️  Static routes MUST come before /:id to avoid param conflicts

/**
 * @openapi
 * /api/jobs/latest:
 *   get:
 *     tags: [Jobs]
 *     summary: Get 5 newest open jobs (for landing page)
 *     responses:
 *       200: { description: Latest jobs }
 */
router.get('/latest', jobController.getLatestJobs);

/**
 * @openapi
 * /api/jobs/recommended:
 *   get:
 *     tags: [Jobs]
 *     summary: Get skill-matched jobs ranked by percentage (Seeker only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Recommended jobs with match_percentage }
 */
router.get('/recommended', protect, authorize('seeker'), jobController.getRecommendedJobs);

/**
 * @openapi
 * /api/jobs/my-postings:
 *   get:
 *     tags: [Jobs]
 *     summary: All jobs posted by the logged-in recruiter
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Recruiter job list }
 */
router.get('/my-postings', protect, authorize('recruiter'), jobController.getMyPostings);

/**
 * @openapi
 * /api/jobs:
 *   get:
 *     tags: [Jobs]
 *     summary: List open jobs with search, filters, and pagination
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: job_type
 *         schema: { type: string, enum: [Full-time, Part-time, Contract, Internship, Remote, Hybrid] }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Job list with pagination }
 *   post:
 *     tags: [Jobs]
 *     summary: Post a new job (Recruiter only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:       { type: string }
 *               description: { type: string }
 *               location:    { type: string }
 *               job_type:    { type: string }
 *               salary_range:{ type: string }
 *               skillIds:    { type: array, items: { type: integer } }
 *     responses:
 *       201: { description: Job created }
 */
router.get('/',  jobController.getAllJobs);
router.post('/', protect, authorize('recruiter'), createJobRules, validate, jobController.createJob);

/**
 * @openapi
 * /api/jobs/{id}:
 *   get:
 *     tags: [Jobs]
 *     summary: Get full job details with company info
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Job details }
 *       404: { description: Not found }
 *   put:
 *     tags: [Jobs]
 *     summary: Edit own job post (Recruiter only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Job updated }
 *       403: { description: Forbidden }
 *   delete:
 *     tags: [Jobs]
 *     summary: Delete own job post (Recruiter only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Job deleted }
 */
router.get('/:id',    jobController.getJobById);
router.put('/:id',    protect, authorize('recruiter'), updateJobRules, validate, jobController.updateJob);
router.delete('/:id', protect, authorize('recruiter'), jobController.deleteJob);

/**
 * @openapi
 * /api/jobs/{id}/status:
 *   patch:
 *     tags: [Jobs]
 *     summary: Toggle job status open/closed (Recruiter only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Status toggled }
 */
router.patch('/:id/status', protect, authorize('recruiter'), jobController.toggleJobStatus);

module.exports = router;
