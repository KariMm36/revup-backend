'use strict';

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @openapi
 * tags:
 *   name: Admin
 *   description: Admin Panel (Admin Only)
 */

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users with optional role filter and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [seeker, recruiter, admin] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: User list with pagination }
 */
router.get('/users', protect, authorize('admin'), adminController.getAllUsers);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a user account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: User deleted }
 *       403: { description: Cannot delete admin }
 *       404: { description: User not found }
 */
router.delete('/users/:id', protect, authorize('admin'), adminController.deleteUser);

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Platform-wide metrics (users, jobs, applications)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Platform stats }
 */
router.get('/stats', protect, authorize('admin'), adminController.getPlatformStats);

/**
 * @openapi
 * /api/admin/jobs:
 *   get:
 *     tags: [Admin]
 *     summary: Get all jobs (open and closed)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, closed] }
 *     responses:
 *       200: { description: List of all jobs }
 */
router.get('/jobs', protect, authorize('admin'), adminController.getAllJobs);

/**
 * @openapi
 * /api/admin/stats/jobs:
 *   get:
 *     tags: [Admin]
 *     summary: Detailed job analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Job analytics }
 */
router.get('/stats/jobs', protect, authorize('admin'), adminController.getJobStats);

/**
 * @openapi
 * /api/admin/users:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new user (useful for provisioning admins)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:     { type: string }
 *               email:    { type: string }
 *               password: { type: string }
 *               role:     { type: string, enum: [seeker, recruiter, admin] }
 *     responses:
 *       201: { description: User created }
 */
router.post('/users', protect, authorize('admin'), adminController.createUser);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: View single user detail
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: User details }
 */
router.get('/users/:id', protect, authorize('admin'), adminController.getUserById);

/**
 * @openapi
 * /api/admin/users/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Suspend or activate a user account
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
 *               status: { type: string, enum: [active, suspended] }
 *     responses:
 *       200: { description: User status updated }
 */
router.patch('/users/:id/status', protect, authorize('admin'), adminController.updateUserStatus);

/**
 * @openapi
 * /api/admin/jobs/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Force-delete any job post
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
router.delete('/jobs/:id', protect, authorize('admin'), adminController.deleteJob);

module.exports = router;
