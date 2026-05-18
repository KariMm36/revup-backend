'use strict';

const { body, param } = require('express-validator');

const VALID_TRACKS = ['Frontend', 'Backend', 'AI Engineering', 'Data Engineering'];

// POST /api/interview/start
const startRules = [
  body('track')
    .notEmpty().withMessage('Track is required.')
    .isIn(VALID_TRACKS)
    .withMessage(`Track must be one of: ${VALID_TRACKS.join(', ')}.`),
];

// POST /api/interview/submit
const submitRules = [
  body('interview_id')
    .notEmpty().withMessage('interview_id is required.')
    .isInt({ gt: 0 }).withMessage('interview_id must be a positive integer.'),

  body('mcq_answers')
    .notEmpty().withMessage('mcq_answers is required.')
    .isObject().withMessage('mcq_answers must be an object of { "question_id": "answer" }.'),

  body('written_answers')
    .notEmpty().withMessage('written_answers is required.')
    .isObject().withMessage('written_answers must be an object of { "index": "answer" }.'),
];

// PATCH /api/interview/:id/decision
const decisionRules = [
  param('id')
    .isInt({ gt: 0 }).withMessage('Interview ID must be a valid integer.'),

  body('decision')
    .notEmpty().withMessage('decision is required.')
    .isIn(['passed', 'failed']).withMessage('decision must be either "passed" or "failed".'),
];

module.exports = { startRules, submitRules, decisionRules };
