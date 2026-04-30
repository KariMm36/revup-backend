'use strict';

const { body } = require('express-validator');

const applyRules = [
  body('cover_letter').optional().trim().isLength({ max: 3000 }).withMessage('Cover letter must be at most 3000 characters.'),
];

const updateStatusRules = [
  body('status')
    .notEmpty().withMessage('Status is required.')
    .isIn(['applied', 'shortlisted', 'rejected', 'hired'])
    .withMessage('Status must be one of: applied, shortlisted, rejected, hired.'),
];

module.exports = { applyRules, updateStatusRules };
