'use strict';

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  registerRules, loginRules, forgotPasswordRules,
  resetPasswordRules, updatePasswordRules,
} = require('../validators/authValidators');

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Authentication & Account Management
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:    { type: string, example: John Doe }
 *               email:   { type: string, example: john@example.com }
 *               password: { type: string, example: password123 }
 *               role:    { type: string, enum: [seeker, recruiter], example: seeker }
 *     responses:
 *       201: { description: Account created }
 *       409: { description: Email already registered }
 *       422: { description: Validation error }
 */
router.post('/register', registerRules, validate, authController.register);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Current user profile }
 *       401: { description: Unauthorized }
 */
router.get('/me', protect, authController.getMe);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and retrieve JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: john@example.com }
 *               password: { type: string, example: password123 }
 *     responses:
 *       200: { description: Logged in }
 *       401: { description: Invalid credentials }
 */
router.post('/login', loginRules, validate, authController.login);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset link via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: john@example.com }
 *     responses:
 *       200: { description: Reset link sent if email exists }
 */
router.post('/forgot-password', forgotPasswordRules, validate, authController.forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password/{token}:
 *   put:
 *     tags: [Auth]
 *     summary: Reset password using token from email
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, example: newpassword123 }
 *     responses:
 *       200: { description: Password reset }
 *       400: { description: Invalid or expired token }
 */
router.put('/reset-password/:token', resetPasswordRules, validate, authController.resetPassword);

/**
 * @openapi
 * /api/auth/update-password:
 *   put:
 *     tags: [Auth]
 *     summary: Update password (authenticated)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Password updated }
 *       400: { description: Incorrect current password }
 */
router.put('/update-password', protect, updatePasswordRules, validate, authController.updatePassword);

module.exports = router;
