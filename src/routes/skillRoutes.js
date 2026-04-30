'use strict';

const express = require('express');
const router = express.Router();

const skillController = require('../controllers/skillController');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @openapi
 * tags:
 *   name: Skills
 *   description: Skill Master List
 */

/**
 * @openapi
 * /api/skills:
 *   get:
 *     tags: [Skills]
 *     summary: Get all skills (public — for autocomplete)
 *     responses:
 *       200: { description: Skills list }
 *   post:
 *     tags: [Skills]
 *     summary: Add a new skill (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: React.js }
 *     responses:
 *       201: { description: Skill created }
 *       409: { description: Skill already exists }
 */
router.get('/',  skillController.getAllSkills);
router.post('/', protect, authorize('admin'), skillController.createSkill);

/**
 * @openapi
 * /api/skills/{id}:
 *   put:
 *     tags: [Skills]
 *     summary: Update skill name (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200: { description: Skill updated }
 *   delete:
 *     tags: [Skills]
 *     summary: Delete a skill (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Skill deleted }
 */
router.put('/:id', protect, authorize('admin'), skillController.updateSkill);
router.delete('/:id', protect, authorize('admin'), skillController.deleteSkill);

module.exports = router;
