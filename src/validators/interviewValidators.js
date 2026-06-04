'use strict';

const { body, param } = require('express-validator');

// POST /api/interview/start
const startRules = [
  body('job_id')
    .notEmpty().withMessage('job_id is required.')
    .isInt({ gt: 0 }).withMessage('job_id must be a positive integer.'),
];

// POST /api/interview/:id/answer
const answerRules = [
  param('id')
    .isInt({ gt: 0 }).withMessage('Interview ID must be a valid integer.'),

  body('question_id')
    .notEmpty().withMessage('question_id is required.')
    .isInt({ gt: 0 }).withMessage('question_id must be a positive integer.'),

  body('answer')
    .notEmpty().withMessage('answer is required.')
    .isString().withMessage('answer must be a string.')
    .isLength({ min: 1, max: 5000 }).withMessage('answer must be between 1 and 5000 characters.'),

  body('time_taken_seconds')
    .notEmpty().withMessage('time_taken_seconds is required.')
    .isInt({ min: 0 }).withMessage('time_taken_seconds must be a non-negative integer.'),
];

// POST /api/interview/:id/track
const cheatEventRules = [
  param('id')
    .isInt({ gt: 0 }).withMessage('Interview ID must be a valid integer.'),

  body('event_type')
    .notEmpty().withMessage('event_type is required.')
    .isString().withMessage('event_type must be a string.'),

  body('details')
    .notEmpty().withMessage('details is required.')
    .isString().withMessage('details must be a string.'),
];

// PATCH /api/interview/:id/decision
const decisionRules = [
  param('id')
    .isInt({ gt: 0 }).withMessage('Interview ID must be a valid integer.'),

  body('decision')
    .notEmpty().withMessage('decision is required.')
    .isIn(['passed', 'failed']).withMessage('decision must be either "passed" or "failed".'),
];

module.exports = { startRules, answerRules, cheatEventRules, decisionRules };
