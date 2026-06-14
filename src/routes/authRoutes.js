'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');

const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  registerRules, loginRules, forgotPasswordRules,
  resetPasswordRules, updatePasswordRules,
} = require('../validators/authValidators');

const rateLimit = require('express-rate-limit');
// AUTH_RATE_LIMIT_MAX can be set in Railway to a high value during testing (e.g. 100)
// and reset to 10 when going to production
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { success: false, message: 'Too many attempts from this IP, please try again after 15 minutes.' },
});

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
router.post('/register', authLimiter, registerRules, validate, authController.register);

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
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using HTTP-only cookie
 *     responses:
 *       200: { description: New access token issued }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh', authLimiter, authController.refreshToken);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and clear refresh token
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authLimiter, authController.logout);

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
router.post('/login', authLimiter, loginRules, validate, authController.login);

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify 2FA OTP code and receive JWT
 *     description: |
 *       Called after a successful password login. Submit the `otp_token` from the login
 *       response and the 6-digit code sent to the user's email to receive the real JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp_token, code]
 *             properties:
 *               otp_token:
 *                 type: string
 *                 description: The temporary token returned by POST /api/auth/login
 *               code:
 *                 type: string
 *                 example: "483921"
 *                 description: The 6-digit code sent to the user's email
 *     responses:
 *       200: { description: Verified — JWT and user returned }
 *       400: { description: Missing fields }
 *       401: { description: Invalid or expired code / session }
 */
router.post('/verify-otp', authLimiter, authController.verifyOtp);

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
router.post('/forgot-password', authLimiter, forgotPasswordRules, validate, authController.forgotPassword);

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
router.put('/reset-password/:token', authLimiter, resetPasswordRules, validate, authController.resetPassword);

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

// ─── OAuth Routes ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Initiate Google OAuth login
 *     description: Redirects the user to Google's consent screen. Open this URL directly in the browser — not via fetch/axios.
 *     responses:
 *       302: { description: Redirect to Google }
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

/**
 * @openapi
 * /api/auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth callback
 *     description: Google redirects here after user consents. Redirects to FRONTEND_URL/oauth-callback?token=...&newUser=true|false
 *     responses:
 *       302: { description: Redirect to frontend with token }
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  authController.oauthCallback
);

/**
 * @openapi
 * /api/auth/github:
 *   get:
 *     tags: [Auth]
 *     summary: Initiate GitHub OAuth login
 *     description: Redirects the user to GitHub's consent screen. Open this URL directly in the browser — not via fetch/axios.
 *     responses:
 *       302: { description: Redirect to GitHub }
 */
router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));

/**
 * @openapi
 * /api/auth/github/callback:
 *   get:
 *     tags: [Auth]
 *     summary: GitHub OAuth callback
 *     description: GitHub redirects here after user consents. Redirects to FRONTEND_URL/oauth-callback?token=...&newUser=true|false
 *     responses:
 *       302: { description: Redirect to frontend with token }
 */
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  authController.oauthCallback
);

/**
 * @openapi
 * /api/auth/complete-profile:
 *   post:
 *     tags: [Auth]
 *     summary: Set role for new OAuth user (called once after OAuth signup)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [seeker, recruiter]
 *                 example: seeker
 *     responses:
 *       200: { description: Role set, fresh JWT returned }
 *       400: { description: Invalid role or profile already completed }
 */
router.post('/complete-profile', protect, authController.completeProfile);

module.exports = router;

