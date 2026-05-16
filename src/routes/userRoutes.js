'use strict';

const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { updateProfileRules, updateSkillsRules } = require('../validators/userValidators');
const { uploadResume, uploadProfilePic } = require('../config/multer');

/**
 * @openapi
 * tags:
 *   name: Users
 *   description: Seeker Profile Management
 */

/**
 * @openapi
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get logged-in user profile with skills
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: User profile }
 *   put:
 *     tags: [Users]
 *     summary: Update bio and personal info
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               bio:  { type: string }
 *     responses:
 *       200: { description: Profile updated }
 */
router.get('/profile',  protect, userController.getProfile);
router.put('/profile',  protect, authorize('seeker', 'recruiter'), updateProfileRules, validate, userController.updateProfile);

/**
 * @openapi
 * /api/users/stats:
 *   get:
 *     tags: [Users]
 *     summary: Seeker dashboard stats — application counts by status + saved jobs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seeker stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_applications: { type: integer }
 *                     by_status:
 *                       type: object
 *                       properties:
 *                         applied:     { type: integer }
 *                         shortlisted: { type: integer }
 *                         rejected:    { type: integer }
 *                         hired:       { type: integer }
 *                     saved_jobs: { type: integer }
 *                     recent_applications:
 *                       type: array
 */
router.get('/stats', protect, authorize('seeker'), userController.getSeekerStats);

/**
 * @openapi
 * /api/users/skills:
 *   put:
 *     tags: [Users]
 *     summary: Sync seeker skills (full replace)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               skillIds:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [1, 3, 5]
 *     responses:
 *       200: { description: Skills updated }
 */
router.put('/skills', protect, authorize('seeker'), updateSkillsRules, validate, userController.updateSkills);

/**
 * @openapi
 * /api/users/resume:
 *   post:
 *     tags: [Users]
 *     summary: Upload or replace resume (PDF, max 5MB)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume: { type: string, format: binary }
 *     responses:
 *       200: { description: Resume uploaded }
 *       400: { description: Invalid file type }
 */
router.post('/resume', protect, authorize('seeker'), uploadResume.single('resume'), userController.uploadResume);

/**
 * @openapi
 * /api/users/profile-pic:
 *   post:
 *     tags: [Users]
 *     summary: Upload profile picture (Max 2MB, Images only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo: { type: string, format: binary }
 *     responses:
 *       200: { description: Profile picture uploaded }
 */
router.post('/profile-pic', protect, uploadProfilePic.single('logo'), userController.uploadProfilePic);

/**
 * @openapi
 * /api/users/search:
 *   get:
 *     tags: [Users]
 *     summary: Recruiter searches candidate database
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of candidate profiles }
 */
router.get('/search', protect, authorize('recruiter'), userController.searchCandidates);

/**
 * @openapi
 * /api/users/saved-jobs:
 *   get:
 *     tags: [Users]
 *     summary: Get bookmarked jobs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of saved jobs }
 */
router.get('/saved-jobs', protect, authorize('seeker'), userController.getSavedJobs);

/**
 * @openapi
 * /api/users/save-job/{id}:
 *   post:
 *     tags: [Users]
 *     summary: Toggle bookmark for a job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Job saved or removed }
 */
router.post('/save-job/:id', protect, authorize('seeker'), userController.toggleSaveJob);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Recruiter views a seeker's public profile (Privacy Guarded)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Seeker profile }
 *       403: { description: Forbidden - Seeker has not applied to your jobs }
 */
router.get('/:id', protect, authorize('recruiter'), userController.getSeekerProfile);

/**
 * @openapi
 * /api/users/me:
 *   delete:
 *     tags: [Users]
 *     summary: Delete own account (Admin cannot self-delete)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Account deleted }
 */
router.delete('/me', protect, userController.deleteAccount);

module.exports = router;
