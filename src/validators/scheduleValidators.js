'use strict';

const { body, param } = require('express-validator');

// POST /api/schedule
const scheduleRules = [
  body('interview_id')
    .notEmpty().withMessage('interview_id is required.')
    .isInt({ gt: 0 }).withMessage('interview_id must be a positive integer.'),

  body('scheduled_at')
    .notEmpty().withMessage('scheduled_at is required.')
    .isISO8601().withMessage('scheduled_at must be a valid ISO 8601 date-time (e.g. "2026-06-01T10:00:00.000Z").')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('scheduled_at must be a future date and time.');
      }
      return true;
    }),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Location must be at most 500 characters.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Notes must be at most 2000 characters.'),
];

// PATCH /api/schedule/:id
const updateScheduleRules = [
  param('id')
    .isInt({ gt: 0 }).withMessage('Schedule ID must be a valid integer.'),

  body('scheduled_at')
    .optional()
    .isISO8601().withMessage('scheduled_at must be a valid ISO 8601 date-time.')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('scheduled_at must be a future date and time.');
      }
      return true;
    }),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Location must be at most 500 characters.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Notes must be at most 2000 characters.'),

  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'completed'])
    .withMessage('status must be one of: pending, confirmed, completed.'),
];

module.exports = { scheduleRules, updateScheduleRules };
