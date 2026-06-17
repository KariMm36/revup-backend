'use strict';

const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Job, Company, Skill, Application, User } = require('../models');
const aiService = require('../services/aiService');

// ── Helper: check if recruiter has access to a company ───────────────────────
const recruiterBelongsToCompany = (user, company) => {
  return company.recruiter_id === user.id || user.company_id === company.id;
};

// ── Helper: get company for recruiter (owner OR assigned) ────────────────────
const getRecruiterCompany = async (userId) => {
  const owned = await Company.findOne({ where: { recruiter_id: userId } });
  if (owned) return owned;
  const user = await User.findByPk(userId, { attributes: ['id', 'company_id'] });
  if (user && user.company_id) return await Company.findByPk(user.company_id);
  return null;
};

// GET /api/jobs  — paginated list with search & filters
exports.getAllJobs = async (req, res, next) => {
  try {
    const { search, job_type, location, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { status: 'open' };
    if (search) where.title = { [Op.like]: `%${search}%` };
    if (job_type) where.job_type = job_type;
    if (location) where.location = { [Op.like]: `%${location}%` };

    const { count, rows } = await Job.findAndCountAll({
      where,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'logo'] },
        { model: Skill,   as: 'skills',  through: { attributes: [] } },
      ],
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

// GET /api/jobs/latest — top 5 newest open jobs
exports.getLatestJobs = async (req, res, next) => {
  try {
    const jobs = await Job.findAll({
      where: { status: 'open' },
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'logo'] },
        { model: Skill,   as: 'skills',  through: { attributes: [] } },
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });
    return res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs/recommended — AI-based job matching (Seeker only)
exports.getRecommendedJobs = async (req, res, next) => {
  try {
    const seekerId = req.user.id;

    // 1. Fetch the seeker's profile to build the profileData payload
    const user = await User.findByPk(seekerId, {
      include: [{ model: Skill, as: 'skills', through: { attributes: [] } }],
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const skillNames = user.skills ? user.skills.map(s => s.name) : [];
    
    const profileData = {
      skills: skillNames,
      title: user.title || '', // You might want to extract title from somewhere, defaulting to empty
      summary: user.bio || ''
    };

    // 2. Fetch all local open jobs to pass to the AI
    const allOpenJobs = await Job.findAll({
      where: { status: 'open' },
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'logo'] },
        { model: Skill,   as: 'skills',  through: { attributes: [] } },
      ],
    });

    // 3. Call the AI recommendation service, passing the local jobs
    const aiResults = await aiService.getJobRecommendations(profileData, allOpenJobs.map(j => j.toJSON()));
    // aiResults = [ { job_id: 4, match_score: 53, ... }, ... ]

    if (!aiResults || aiResults.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 4. Build a map of all AI data for each job
    const aiDataMap = {};
    const jobIds = aiResults.map(r => { 
      aiDataMap[r.job_id] = r; 
      return r.job_id; 
    });

    // 5. Re-sort to match the AI's ranking order and attach the score using the pre-fetched jobs
    const enriched = jobIds
      .map(id => {
        const job = allOpenJobs.find(j => j.id === id);
        if (!job) return null;
        const aiData = aiDataMap[id];
        return { 
          job, 
          score: aiData.match_score,
          match_score: aiData.match_score,
          explanation: aiData.explanation,
          matched_skills: aiData.matched_skills
        };
      })
      .filter(Boolean);

    return res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs/my-postings — recruiter's own jobs (works for owner + assigned)
exports.getMyPostings = async (req, res, next) => {
  try {
    const company = await getRecruiterCompany(req.user.id);
    if (!company) return res.status(404).json({ success: false, message: 'You are not associated with any company.' });

    const jobs = await Job.findAll({
      where: { company_id: company.id },
      include: [{ model: Skill, as: 'skills', through: { attributes: [] } }],
      order: [['createdAt', 'DESC']],
    });

    // Attach applicant count per job
    const jobIds = jobs.map(j => j.id);
    const counts = jobIds.length > 0
      ? await Application.findAll({
          where: { job_id: jobIds },
          attributes: ['job_id', [sequelize.fn('COUNT', sequelize.col('id')), 'applicant_count']],
          group: ['job_id'],
          raw: true,
        })
      : [];

    const countMap = {};
    for (const c of counts) countMap[c.job_id] = parseInt(c.applicant_count);

    const enriched = jobs.map(j => ({
      ...j.toJSON(),
      applicant_count: countMap[j.id] || 0,
    }));

    return res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs/:id — single job detail
exports.getJobById = async (req, res, next) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [
        { model: Company, as: 'company' },
        { model: Skill, as: 'skills', through: { attributes: [] } },
      ],
    });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    return res.status(200).json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

// POST /api/jobs — recruiter creates a job
exports.createJob = async (req, res, next) => {
  try {
    const company = await getRecruiterCompany(req.user.id);
    if (!company) return res.status(400).json({ success: false, message: 'You must be associated with a company before posting jobs.' });

    const { title, description, location, job_type, salary_range, skillIds, application_deadline } = req.body;
    const job = await Job.create({ title, description, location, job_type, salary_range, application_deadline: application_deadline || null, company_id: company.id });

    if (skillIds && skillIds.length > 0) await job.setSkills(skillIds);

    const created = await Job.findByPk(job.id, {
      include: [{ model: Skill, as: 'skills', through: { attributes: [] } }],
    });
    return res.status(201).json({ success: true, message: 'Job posted.', data: created });
  } catch (err) {
    next(err);
  }
};

// PUT /api/jobs/:id — recruiter edits own job
exports.updateJob = async (req, res, next) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [{ model: Company, as: 'company' }],
    });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (!recruiterBelongsToCompany(req.user, job.company)) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const { title, description, location, job_type, salary_range, skillIds, application_deadline } = req.body;
    await job.update({ title, description, location, job_type, salary_range, application_deadline: application_deadline !== undefined ? application_deadline : job.application_deadline });
    if (skillIds) await job.setSkills(skillIds);

    return res.status(200).json({ success: true, message: 'Job updated.', data: job });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/jobs/:id — recruiter deletes own job
exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [{ model: Company, as: 'company' }],
    });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (!recruiterBelongsToCompany(req.user, job.company)) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    await job.destroy();
    return res.status(200).json({ success: true, message: 'Job deleted.' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/jobs/:id/status — toggle open/closed
exports.toggleJobStatus = async (req, res, next) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [{ model: Company, as: 'company' }],
    });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (!recruiterBelongsToCompany(req.user, job.company)) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const newStatus = job.status === 'open' ? 'closed' : 'open';
    await job.update({ status: newStatus });

    return res.status(200).json({ success: true, message: `Job is now ${newStatus}.`, status: newStatus });
  } catch (err) {
    next(err);
  }
};
