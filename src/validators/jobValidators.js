'use strict';

const { body } = require('express-validator');

const createJobRules = [
  body('title').trim().notEmpty().withMessage('Job title is required.').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Job description is required.'),
  body('location').optional().trim().isLength({ max: 150 }),
  body('job_type')
    .optional()
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote', 'Hybrid'])
    .withMessage('Invalid job type.'),
  body('salary_range').optional().trim().isLength({ max: 100 }),
  body('skillIds').optional().isArray().withMessage('skillIds must be an array.'),
  body('application_deadline')
    .optional()
    .isISO8601().withMessage('application_deadline must be a valid date (ISO 8601).')
    .custom((value) => {
      if (new Date(value) <= new Date()) throw new Error('application_deadline must be a future date.');
      return true;
    }),
];

const updateJobRules = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty.'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty.'),
  body('job_type')
    .optional()
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote', 'Hybrid'])
    .withMessage('Invalid job type.'),
  body('skillIds').optional().isArray().withMessage('skillIds must be an array.'),
  body('application_deadline')
    .optional()
    .isISO8601().withMessage('application_deadline must be a valid date (ISO 8601).'),
];

module.exports = { createJobRules, updateJobRules };
