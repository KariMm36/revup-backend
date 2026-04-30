'use strict';

const { Company, Job, Application } = require('../models');

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
      include: [{ model: Job, as: 'jobs', where: { status: 'open' }, required: false }]
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
    const company = await Company.findOne({ where: { recruiter_id: req.user.id } });
    if (!company) return res.status(404).json({ success: false, message: 'You have not created a company profile yet.' });
    return res.status(200).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

// POST /api/companies
exports.createCompany = async (req, res, next) => {
  try {
    const exists = await Company.findOne({ where: { recruiter_id: req.user.id } });
    if (exists) return res.status(409).json({ success: false, message: 'You already have a company profile.' });

    const { name, website, description } = req.body;
    const company = await Company.create({ name, website, description, recruiter_id: req.user.id });

    return res.status(201).json({ success: true, message: 'Company profile created.', data: company });
  } catch (err) {
    next(err);
  }
};

// PUT /api/companies
exports.updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findOne({ where: { recruiter_id: req.user.id } });
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
    const company = await Company.findOne({ where: { recruiter_id: req.user.id } });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    const totalJobs = await Job.count({ where: { company_id: company.id } });
    const openJobs = await Job.count({ where: { company_id: company.id, status: 'open' } });

    const jobIds = (await Job.findAll({ where: { company_id: company.id }, attributes: ['id'] })).map((j) => j.id);
    const totalApplications = jobIds.length > 0 ? await Application.count({ where: { job_id: jobIds } }) : 0;

    return res.status(200).json({
      success: true,
      data: { totalJobs, openJobs, closedJobs: totalJobs - openJobs, totalApplications },
    });
  } catch (err) {
    next(err);
  }
};
