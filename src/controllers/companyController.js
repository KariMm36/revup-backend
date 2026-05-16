'use strict';

const { Company, Job, Application, User } = require('../models');

// ── Helper: resolve the company a recruiter belongs to ───────────────────────
// A recruiter either OWNS the company (recruiter_id) or is ASSIGNED to it (company_id).
const getRecruiterCompany = async (userId) => {
  // 1. Check if they own a company
  const owned = await Company.findOne({ where: { recruiter_id: userId } });
  if (owned) return owned;

  // 2. Check if they are assigned to a company via their user record
  const user = await User.findByPk(userId, { attributes: ['id', 'company_id'] });
  if (user && user.company_id) {
    return await Company.findByPk(user.company_id);
  }
  return null;
};

// GET /api/companies (Public)
exports.getAllCompanies = async (req, res, next) => {
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name', 'website', 'logo'],
      order: [['name', 'ASC']],
    });
    return res.status(200).json({ success: true, data: companies });
  } catch (err) {
    next(err);
  }
};

// GET /api/companies/:id (Public)
exports.getCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [
        { model: Job, as: 'jobs', where: { status: 'open' }, required: false },
        { model: User, as: 'recruiters', attributes: ['id', 'name', 'email', 'profile_pic'] },
      ],
    });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });
    return res.status(200).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

// GET /api/companies/my-company
exports.getMyCompany = async (req, res, next) => {
  try {
    const company = await getRecruiterCompany(req.user.id);
    if (!company) return res.status(404).json({ success: false, message: 'You are not associated with any company yet.' });
    return res.status(200).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

// POST /api/companies
exports.createCompany = async (req, res, next) => {
  try {
    const exists = await Company.findOne({ where: { recruiter_id: req.user.id } });
    if (exists) return res.status(409).json({ success: false, message: 'You already own a company profile.' });

    const { name, website, description } = req.body;
    const company = await Company.create({ name, website, description, recruiter_id: req.user.id });

    // Auto-assign the creator to the company
    await User.update({ company_id: company.id }, { where: { id: req.user.id } });

    return res.status(201).json({ success: true, message: 'Company profile created.', data: company });
  } catch (err) {
    next(err);
  }
};

// PUT /api/companies
exports.updateCompany = async (req, res, next) => {
  try {
    const company = await getRecruiterCompany(req.user.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    const { name, website, description } = req.body;
    const logoUrl = req.file ? `/uploads/logos/${req.file.filename}` : company.logo;

    await company.update({
      name: name || company.name,
      website: website || company.website,
      description: description || company.description,
      logo: logoUrl,
    });

    return res.status(200).json({ success: true, message: 'Company updated.', data: company });
  } catch (err) {
    next(err);
  }
};

// GET /api/companies/stats
exports.getCompanyStats = async (req, res, next) => {
  try {
    const company = await getRecruiterCompany(req.user.id);
    if (!company) return res.status(404).json({ success: false, message: 'You are not associated with any company.' });

    const totalJobs = await Job.count({ where: { company_id: company.id } });
    const openJobs = await Job.count({ where: { company_id: company.id, status: 'open' } });

    const jobIds = (await Job.findAll({ where: { company_id: company.id }, attributes: ['id'] })).map((j) => j.id);
    const totalApplications = jobIds.length > 0 ? await Application.count({ where: { job_id: jobIds } }) : 0;

    const recruiterCount = await User.count({ where: { company_id: company.id } });

    return res.status(200).json({
      success: true,
      data: {
        total_jobs: totalJobs,
        open_jobs: openJobs,
        closed_jobs: totalJobs - openJobs,
        total_applications: totalApplications,
        total_recruiters: recruiterCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/companies/assign-recruiter
// Company owner assigns another recruiter to their company by email
exports.assignRecruiter = async (req, res, next) => {
  try {
    // Only the company OWNER can assign recruiters
    const company = await Company.findOne({ where: { recruiter_id: req.user.id } });
    if (!company) {
      return res.status(403).json({ success: false, message: 'Only the company owner can assign recruiters.' });
    }

    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Recruiter email is required.' });

    const recruiter = await User.findOne({ where: { email, role: 'recruiter' } });
    if (!recruiter) {
      return res.status(404).json({ success: false, message: 'No recruiter account found with that email.' });
    }

    if (recruiter.company_id && recruiter.company_id !== company.id) {
      return res.status(409).json({ success: false, message: 'This recruiter is already assigned to another company.' });
    }

    if (recruiter.company_id === company.id) {
      return res.status(409).json({ success: false, message: 'This recruiter is already part of your company.' });
    }

    await recruiter.update({ company_id: company.id });

    return res.status(200).json({
      success: true,
      message: `${recruiter.name} has been added to ${company.name}.`,
      data: { recruiter_id: recruiter.id, recruiter_name: recruiter.name, company_id: company.id },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/companies/remove-recruiter/:recruiterId
// Company owner removes a recruiter from their company
exports.removeRecruiter = async (req, res, next) => {
  try {
    const company = await Company.findOne({ where: { recruiter_id: req.user.id } });
    if (!company) {
      return res.status(403).json({ success: false, message: 'Only the company owner can remove recruiters.' });
    }

    const recruiterId = parseInt(req.params.recruiterId);

    // Prevent owner from removing themselves
    if (recruiterId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Company owner cannot be removed. Delete the company instead.' });
    }

    const recruiter = await User.findOne({ where: { id: recruiterId, company_id: company.id } });
    if (!recruiter) {
      return res.status(404).json({ success: false, message: 'Recruiter not found in your company.' });
    }

    await recruiter.update({ company_id: null });

    return res.status(200).json({ success: true, message: `${recruiter.name} has been removed from ${company.name}.` });
  } catch (err) {
    next(err);
  }
};

// GET /api/companies/recruiters
// List all recruiters belonging to the requester's company
exports.getCompanyRecruiters = async (req, res, next) => {
  try {
    const company = await getRecruiterCompany(req.user.id);
    if (!company) return res.status(404).json({ success: false, message: 'You are not associated with any company.' });

    const recruiters = await User.findAll({
      where: { company_id: company.id },
      attributes: ['id', 'name', 'email', 'profile_pic', 'createdAt'],
    });

    return res.status(200).json({ success: true, data: recruiters });
  } catch (err) {
    next(err);
  }
};

module.exports = exports;
