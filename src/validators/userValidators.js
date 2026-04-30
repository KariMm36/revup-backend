'use strict';

const { body } = require('express-validator');

const updateProfileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.').isLength({ max: 100 }),
  body('bio').optional().trim().isLength({ max: 1000 }).withMessage('Bio must be at most 1000 characters.'),
];

const updateSkillsRules = [
  body('skillIds')
    .isArray({ min: 0 })
    .withMessage('skillIds must be an array.')
    .custom((arr) => arr.every(Number.isInteger))
    .withMessage('Each skill ID must be an integer.'),
];

module.exports = { updateProfileRules, updateSkillsRules };
