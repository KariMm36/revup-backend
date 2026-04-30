'use strict';

const { Skill } = require('../models');

// GET /api/skills
exports.getAllSkills = async (req, res, next) => {
  try {
    const skills = await Skill.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json({ success: true, data: skills });
  } catch (err) {
    next(err);
  }
};

// POST /api/skills (Admin only)
exports.createSkill = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Skill name is required.' });

    const skill = await Skill.create({ name: name.trim() });
    return res.status(201).json({ success: true, message: 'Skill added.', data: skill });
  } catch (err) {
    next(err);
  }
};

// PUT /api/skills/:id (Admin only)
exports.updateSkill = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Skill name is required.' });

    const skill = await Skill.findByPk(req.params.id);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found.' });

    await skill.update({ name: name.trim() });
    return res.status(200).json({ success: true, message: 'Skill updated.', data: skill });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/skills/:id (Admin only)
exports.deleteSkill = async (req, res, next) => {
  try {
    const skill = await Skill.findByPk(req.params.id);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found.' });

    // Assuming CASCADE delete is set up for M:N tables (JobSkill, UserSkill)
    await skill.destroy();
    return res.status(200).json({ success: true, message: 'Skill deleted.' });
  } catch (err) {
    next(err);
  }
};
