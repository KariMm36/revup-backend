'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');

// ─── Helper ──────────────────────────────────────────────────────────────────
const generateToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword, role: role || 'seeker' });

    // Send welcome email (non-blocking)
    sendWelcomeEmail({ to: email, name }).catch(console.error);

    const token = generateToken(user);
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
    }

    const token = generateToken(user);
    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    // respond with success for security (don't reveal if email exists)
    if (!user) {
      return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const token = uuidv4();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.update({ reset_token: token, reset_token_expiry: expiry });

    sendPasswordResetEmail({ to: user.email, name: user.name, resetToken: token }).catch((err) => {
      console.error('[EMAIL ERROR] Failed to send password reset email:', err.message);
    });

    return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({ where: { reset_token: token } });

    if (!user || !user.reset_token_expiry || new Date() > user.reset_token_expiry) {
      return res.status(400).json({ success: false, message: 'Reset token is invalid or has expired.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await user.update({ password: hashedPassword, reset_token: null, reset_token_expiry: null });

    return res.status(200).json({ success: true, message: 'Password has been reset successfully. Please login.' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/update-password (authenticated)
exports.updatePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashedPassword });

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me — verify token and return current user
exports.getMe = async (req, res, next) => {
  try {
    // req.user is already attached by protect middleware (password excluded)
    return res.status(200).json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
};
