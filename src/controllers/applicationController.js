'use strict';

const { Op } = require('sequelize');
const { Application, Job, Company, User, Notification, Skill, Interview } = require('../models');
const { sendApplicationStatusEmail } = require('../services/emailService');

// ── Helper: check if recruiter has access to a company ───────────────────────
const recruiterBelongsToCompany = (user, company) => {
  return company.recruiter_id === user.id || user.company_id === company.id;
};

// ── Helper: get all recruiter IDs for a company ───────────────────────────────
const getCompanyRecruiterIds = async (companyId) => {
  const recruiters = await User.findAll({
    where: { role: 'recruiter', company_id: companyId },
    attributes: ['id'],
  });
  // Also include the company owner
  const company = await Company.findByPk(companyId, { attributes: ['recruiter_id'] });
  const ids = new Set(recruiters.map(r => r.id));
  if (company?.recruiter_id) ids.add(company.recruiter_id);
  return [...ids];
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/applications/apply/:jobId
// ─────────────────────────────────────────────────────────────────────────────
exports.applyToJob = async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.jobId);

    const job = await Job.findByPk(jobId, {
      include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'recruiter_id'] }],
    });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (job.status === 'closed') return res.status(400).json({ success: false, message: 'This job is no longer accepting applications.' });

    // ── Deadline check ────────────────────────────────────────────────────────
    if (job.application_deadline && new Date(job.application_deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: `The application deadline for this job was ${new Date(job.application_deadline).toLocaleDateString('en-US', { dateStyle: 'long' })}. It is no longer accepting applications.`,
      });
    }

    const existing = await Application.findOne({ where: { job_id: jobId, seeker_id: req.user.id } });
    if (existing) return res.status(409).json({ success: false, message: 'You have already applied to this job.' });

    const { cover_letter } = req.body;
    const resumeUrl = req.file ? `/uploads/resumes/${req.file.filename}` : req.user.resume_url;

    const application = await Application.create({
      job_id: jobId,
      seeker_id: req.user.id,
      resume_url: resumeUrl,
      cover_letter,
    });

    // ── Notify all recruiters of this company ─────────────────────────────────
    const recruiterIds = await getCompanyRecruiterIds(job.company_id);
    if (recruiterIds.length > 0) {
      await Notification.bulkCreate(
        recruiterIds.map(rid => ({
          user_id: rid,
          message: `📋 New application received! ${req.user.name} has applied for "${job.title}" at ${job.company.name}.`,
        }))
      );
    }

    return res.status(201).json({ success: true, message: 'Application submitted successfully.', data: application });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/applications/my-applications — seeker's own history + interview status
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.findAll({
      where: { seeker_id: req.user.id },
      include: [{
        model: Job, as: 'job',
        include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'logo'] }],
      }],
      order: [['createdAt', 'DESC']],
    });

    // Attach AI interview info (if any) for each application
    const appIds = applications.map(a => ({ job_id: a.job_id }));
    const interviews = appIds.length > 0
      ? await Interview.findAll({
          where: {
            seeker_id: req.user.id,
            job_id: { [Op.in]: appIds.map(a => a.job_id) },
          },
          attributes: ['id', 'job_id', 'status', 'total_score', 'api_version'],
          order: [['createdAt', 'DESC']],
        })
      : [];

    // Map job_id → latest interview
    const interviewMap = {};
    for (const iv of interviews) {
      if (!interviewMap[iv.job_id]) interviewMap[iv.job_id] = iv;
    }

    const enriched = applications.map(app => ({
      ...app.toJSON(),
      ai_interview: interviewMap[app.job_id] || null,
    }));

    return res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/applications/job/:jobId — recruiter sees all applicants (paginated)
// ─────────────────────────────────────────────────────────────────────────────
exports.getJobApplications = async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Ownership guard
    const job = await Job.findByPk(jobId, { include: [{ model: Company, as: 'company' }] });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (!recruiterBelongsToCompany(req.user, job.company)) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const { count, rows } = await Application.findAndCountAll({
      where: { job_id: jobId },
      include: [{ model: User, as: 'seeker', attributes: ['id', 'name', 'email', 'profile_pic'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/applications/:id — view specific application
// ─────────────────────────────────────────────────────────────────────────────
exports.getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findByPk(req.params.id, {
      include: [
        { model: Job, as: 'job', include: [{ model: Company, as: 'company' }] },
        {
          model: User,
          as: 'seeker',
          attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
          include: [{ model: Skill, as: 'skills', attributes: ['id', 'name'], through: { attributes: [] } }]
        },
      ],
    });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    // ── Privacy / Ownership Guard ───────────────────────────────────────────
    if (req.user.role === 'seeker') {
      if (application.seeker_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only view your own applications.' });
      }
      // Strip internal HR notes from seeker view
      const data = application.toJSON();
      delete data.hr_notes;
      return res.status(200).json({ success: true, data });
    } else if (req.user.role === 'recruiter') {
      if (!recruiterBelongsToCompany(req.user, application.job.company)) {
        return res.status(403).json({ success: false, message: 'You do not have permission to view this application.' });
      }
    }

    return res.status(200).json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/applications/:id/status — recruiter updates status
// ─────────────────────────────────────────────────────────────────────────────
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, rejection_reason, hr_notes } = req.body;

    const application = await Application.findByPk(req.params.id, {
      include: [
        { model: Job, as: 'job', include: [{ model: Company, as: 'company' }] },
        { model: User, as: 'seeker' },
      ],
    });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    // Ownership guard
    if (!recruiterBelongsToCompany(req.user, application.job.company)) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const updates = { status };
    if (hr_notes !== undefined) updates.hr_notes = hr_notes;
    if (status === 'rejected' && rejection_reason) updates.rejection_reason = rejection_reason;

    await application.update(updates);

    // ── Build notification message ────────────────────────────────────────────
    const statusMessages = {
      under_review: `👀 Your application for "${application.job.title}" at ${application.job.company.name} is now under review.`,
      shortlisted:  `🎉 Great news! You've been shortlisted for "${application.job.title}" at ${application.job.company.name}. Stay tuned!`,
      rejected:     `Thank you for applying to "${application.job.title}" at ${application.job.company.name}. Unfortunately, your application was not selected.${rejection_reason ? ` Reason: ${rejection_reason}` : ''}`,
      hired:        `🎊 Congratulations! You've been hired for "${application.job.title}" at ${application.job.company.name}!`,
      applied:      `Your application for "${application.job.title}" at ${application.job.company.name} has been updated to: APPLIED.`,
    };

    await Notification.create({
      user_id: application.seeker_id,
      message: statusMessages[status] || `Your application status has been updated to: ${status}.`,
    });

    // ── Send email for key status changes ─────────────────────────────────────
    if (['shortlisted', 'rejected', 'hired'].includes(status)) {
      sendApplicationStatusEmail({
        to: application.seeker.email,
        seekerName: application.seeker.name,
        jobTitle: application.job.title,
        companyName: application.job.company.name,
        newStatus: status,
        rejectionReason: status === 'rejected' ? rejection_reason : undefined,
      }).catch(console.error);
    }

    return res.status(200).json({ success: true, message: `Application status updated to ${status}.`, data: application });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/applications/:id — seeker withdraws application
// ─────────────────────────────────────────────────────────────────────────────
exports.withdrawApplication = async (req, res, next) => {
  try {
    const application = await Application.findByPk(req.params.id, {
      include: [{ model: Job, as: 'job', attributes: ['title', 'company_id'] }],
    });

    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    if (application.seeker_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only withdraw your own applications.' });
    }

    // Allow withdrawal unless already rejected or hired
    if (['rejected', 'hired'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: `You cannot withdraw an application that is already "${application.status}".`,
      });
    }

    await application.destroy();

    // ── Notify recruiters of the withdrawal ───────────────────────────────────
    const recruiterIds = await getCompanyRecruiterIds(application.job.company_id);
    if (recruiterIds.length > 0) {
      await Notification.bulkCreate(
        recruiterIds.map(rid => ({
          user_id: rid,
          message: `⚠️ ${req.user.name} has withdrawn their application for "${application.job.title}".`,
        }))
      );
    }

    return res.status(200).json({ success: true, message: 'Application withdrawn successfully.' });
  } catch (err) {
    next(err);
  }
};
