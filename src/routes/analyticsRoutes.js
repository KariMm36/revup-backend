'use strict';

const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @openapi
 * tags:
 *   name: Analytics
 *   description: Recruiter Analytics Dashboard APIs
 */

/**
 * @openapi
 * /api/analytics/jobs:
 *   get:
 *     tags: [Analytics]
 *     summary: Per-job analytics — application count per job, open/closed breakdown
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Job analytics data }
 *       401: { description: Unauthorized }
 *       403: { description: Recruiter role required }
 *       404: { description: Not associated with any company }
 */
router.get('/jobs', protect, authorize('recruiter'), analyticsController.getJobAnalytics);

/**
 * @openapi
 * /api/analytics/applications:
 *   get:
 *     tags: [Analytics]
 *     summary: Application analytics — status breakdown + trend over time + top jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *         description: Number of past days for the over_time trend chart (default 30)
 *     responses:
 *       200: { description: Application analytics data }
 *       401: { description: Unauthorized }
 *       403: { description: Recruiter role required }
 *       404: { description: Not associated with any company }
 */
router.get('/applications', protect, authorize('recruiter'), analyticsController.getApplicationAnalytics);

module.exports = router;
