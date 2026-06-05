'use strict';

const { body } = require('express-validator');

const applyRules = [
  body('cover_letter').optional().trim().isLength({ max: 3000 }).withMessage('Cover letter must be at most 3000 characters.'),
];

const updateStatusRules = [
  body('status')
    .notEmpty().withMessage('Status is required.')
    .isIn(['applied', 'under_review', 'shortlisted', 'rejected', 'hired'])
    .withMessage('Status must be one of: applied, under_review, shortlisted, rejected, hired.'),
  body('rejection_reason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Rejection reason must be at most 1000 characters.'),
  body('hr_notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('HR notes must be at most 2000 characters.'),
];

module.exports = { applyRules, updateStatusRules };
