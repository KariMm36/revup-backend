'use strict';

const path = require('path');
const { User, Job, Skill, SavedJob, Application, Company } = require('../models');

// GET /api/users/profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
      include: [{ model: Skill, as: 'skills', attributes: ['id', 'name'], through: { attributes: [] } }],
    });
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio } = req.body;
    const user = await User.findByPk(req.user.id);
    await user.update({ name: name || user.name, bio: bio || user.bio });

    const updated = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
    });
    return res.status(200).json({ success: true, message: 'Profile updated.', data: updated });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/skills
exports.updateSkills = async (req, res, next) => {
  try {
    const { skillIds } = req.body; // Array of skill IDs
    const user = await User.findByPk(req.user.id);

    // setSkills() is the Sequelize magic method for M:N sync
    await user.setSkills(skillIds);

    const updated = await User.findByPk(req.user.id, {
      include: [{ model: Skill, as: 'skills', attributes: ['id', 'name'], through: { attributes: [] } }],
    });
    return res.status(200).json({ success: true, message: 'Skills updated.', data: updated.skills });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/resume
exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const resumeUrl = req.file.path;
    const user = await User.findByPk(req.user.id);
    await user.update({ resume_url: resumeUrl });

    return res.status(200).json({ success: true, message: 'Resume uploaded.', resume_url: resumeUrl });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/profile-pic
exports.uploadProfilePic = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded.' });

    const picUrl = req.file.path;
    const user = await User.findByPk(req.user.id);
    await user.update({ profile_pic: picUrl });

    return res.status(200).json({ success: true, message: 'Profile picture updated.', profile_pic: picUrl });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/saved-jobs
exports.getSavedJobs = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Job,
        as: 'savedJobs',
        through: { attributes: [] },
        where: { status: 'open' },
        required: false,
      }],
    });
    return res.status(200).json({ success: true, data: user.savedJobs });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/save-job/:id
exports.toggleSaveJob = async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id);
    const user = await User.findByPk(req.user.id);

    const job = await Job.findByPk(jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    const savedJobs = await user.getSavedJobs({ where: { id: jobId } });

    if (savedJobs.length > 0) {
      await user.removeSavedJob(job);
      return res.status(200).json({ success: true, saved: false, message: 'Job removed from saved jobs.' });
    } else {
      await user.addSavedJob(job);
      return res.status(200).json({ success: true, saved: true, message: 'Job saved successfully.' });
    }
  } catch (err) {
    next(err);
  }
};

// GET /api/users/stats — Seeker dashboard stats
exports.getSeekerStats = async (req, res, next) => {
  try {
    const seekerId = req.user.id;

    // All application counts in ONE query using conditional aggregation
    const [rows] = await require('../config/db').query(
      `SELECT
         COUNT(*)                             AS total,
         SUM(status = 'applied')              AS applied,
         SUM(status = 'shortlisted')          AS shortlisted,
         SUM(status = 'rejected')             AS rejected,
         SUM(status = 'hired')                AS hired
       FROM applications
       WHERE seeker_id = :seekerId`,
      { replacements: { seekerId } }
    );

    const stats = rows[0] || {};

    // Saved jobs count
    const savedJobsCount = await SavedJob.count({ where: { user_id: seekerId } });

    // Recent applications (last 5) for activity feed
    const recentApplications = await Application.findAll({
      where: { seeker_id: seekerId },
      include: [{
        model: Job,
        as: 'job',
        attributes: ['id', 'title', 'company_id'],
        include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'logo'] }],
      }],
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'status', 'createdAt'],
    });

    return res.status(200).json({
      success: true,
      data: {
        total_applications: parseInt(stats.total)  || 0,
        by_status: {
          applied:     parseInt(stats.applied)     || 0,
          shortlisted: parseInt(stats.shortlisted) || 0,
          rejected:    parseInt(stats.rejected)    || 0,
          hired:       parseInt(stats.hired)       || 0,
        },
        saved_jobs: savedJobsCount,
        recent_applications: recentApplications,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id — Recruiter views a seeker's public profile
// Privacy Rule: seeker must have applied to one of the recruiter's jobs
exports.getSeekerProfile = async (req, res, next) => {
  try {
    const seekerId = parseInt(req.params.id);

    // Confirm the target user exists and is a seeker
    const seeker = await User.findByPk(seekerId, {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
      include: [{ model: Skill, as: 'skills', attributes: ['id', 'name'], through: { attributes: [] } }],
    });
    if (!seeker) return res.status(404).json({ success: false, message: 'User not found.' });
    if (seeker.role !== 'seeker') return res.status(403).json({ success: false, message: 'This profile is not a seeker.' });

    // Privacy guard: support both company owner and assigned recruiter
    let company = await Company.findOne({ where: { recruiter_id: req.user.id } });
    if (!company && req.user.company_id) {
      company = await Company.findByPk(req.user.company_id);
    }
    if (!company) return res.status(403).json({ success: false, message: 'You are not associated with any company.' });

    const recruiterJobIds = (await Job.findAll({ where: { company_id: company.id }, attributes: ['id'] })).map(j => j.id);
    if (recruiterJobIds.length === 0) return res.status(403).json({ success: false, message: 'Access denied.' });

    const hasApplied = await Application.findOne({ where: { seeker_id: seekerId, job_id: recruiterJobIds } });
    if (!hasApplied) return res.status(403).json({ success: false, message: 'You can only view profiles of seekers who applied to your jobs.' });

    return res.status(200).json({ success: true, data: seeker });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/me — user deletes their own account
exports.deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be self-deleted. Contact a super admin.' });
    }
    await user.destroy();
    return res.status(200).json({ success: true, message: 'Your account has been permanently deleted.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/search — Recruiter searches for candidates
exports.searchCandidates = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const { keyword, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Ensure only recruiters with a company profile can search
    const { Company } = require('../models');
    const company = await Company.findOne({ where: { recruiter_id: req.user.id } });
    if (!company) return res.status(403).json({ success: false, message: 'You must have a company profile to search candidates.' });

    const where = { role: 'seeker', status: 'active' };
    
    // Only search users who have filled out their bio/name
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { bio: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: ['id', 'name', 'bio', 'profile_pic', 'resume_url'],
      include: [{ model: Skill, as: 'skills', attributes: ['name'], through: { attributes: [] } }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
};
