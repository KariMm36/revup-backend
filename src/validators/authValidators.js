'use strict';

const { body } = require('express-validator');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }).withMessage('Name must be at most 100 characters.'),
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 }).withMessage('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol.'),
  body('role').optional().isIn(['seeker', 'recruiter']).withMessage('Role must be seeker or recruiter.'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const forgotPasswordRules = [
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
];

const resetPasswordRules = [
  body('password').isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 }).withMessage('New password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol.'),
];

const updatePasswordRules = [
  body('oldPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 }).withMessage('New password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol.'),
];

module.exports = {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  updatePasswordRules,
};
