'use strict';

const { body } = require('express-validator');

const updateProfileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.').isLength({ max: 100 }),
  body('bio').optional().trim().isLength({ max: 1000 }).withMessage('Bio must be at most 1000 characters.'),
  body('phone').optional().trim().isLength({ max: 30 }).withMessage('Phone must be at most 30 characters.'),
  body('location').optional().trim().isLength({ max: 150 }).withMessage('Location must be at most 150 characters.'),
];

const updateSkillsRules = [
  body('skillIds')
    .isArray({ min: 0 })
    .withMessage('skillIds must be an array.')
    .custom((arr) => arr.every(Number.isInteger))
    .withMessage('Each skill ID must be an integer.'),
];

const updateExperienceRules = [
  body('experience').isArray().withMessage('experience must be an array.'),
  body('experience.*.title').notEmpty().withMessage('Title is required for experience.'),
  body('experience.*.company').optional().isString(),
  body('experience.*.duration').optional().isString(),
  body('experience.*.description').optional().isString(),
];

const updateEducationRules = [
  body('education').isArray().withMessage('education must be an array.'),
  body('education.*.degree').notEmpty().withMessage('Degree is required for education.'),
  body('education.*.university').optional().isString(),
  body('education.*.duration').optional().isString(),
];

const updateCertificationsRules = [
  body('certifications').isArray().withMessage('certifications must be an array.'),
  body('certifications.*.name').notEmpty().withMessage('Name is required for certification.'),
  body('certifications.*.organization').optional().isString(),
  body('certifications.*.year').optional().isString(),
];

module.exports = { updateProfileRules, updateSkillsRules, updateExperienceRules, updateEducationRules, updateCertificationsRules };
