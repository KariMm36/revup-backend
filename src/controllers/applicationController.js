'use strict';

const { Application, Job, Company, User, Notification } = require('../models');
const { sendApplicationStatusEmail } = require('../services/emailService');

// POST /api/applications/apply/:jobId
exports.applyToJob = async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.jobId);

    const job = await Job.findByPk(jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (job.status === 'closed') return res.status(400).json({ success: false, message: 'This job is no longer accepting applications.' });

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

    return res.status(201).json({ success: true, message: 'Application submitted successfully.', data: application });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/my-applications
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
    return res.status(200).json({ success: true, data: applications });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/job/:jobId — recruiter sees all applicants for their job
exports.getJobApplications = async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.jobId);

    // Ownership guard
    const job = await Job.findByPk(jobId, { include: [{ model: Company, as: 'company' }] });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (job.company.recruiter_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden.' });

    const applications = await Application.findAll({
      where: { job_id: jobId },
      include: [{ model: User, as: 'seeker', attributes: ['id', 'name', 'email', 'profile_pic'] }],
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ success: true, data: applications });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/:id — view specific application
exports.getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findByPk(req.params.id, {
      include: [
        { model: Job, as: 'job', include: [{ model: Company, as: 'company' }] },
        { model: User, as: 'seeker', attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] } },
      ],
    });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    // ── Privacy / Ownership Guard ───────────────────────────────────────────
    if (req.user.role === 'seeker') {
      if (application.seeker_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only view your own applications.' });
      }
    } else if (req.user.role === 'recruiter') {
      if (application.job.company.recruiter_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You do not have permission to view this application.' });
      }
    }

    return res.status(200).json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
};

// PUT /api/applications/:id/status — recruiter updates status + triggers notification + email
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const application = await Application.findByPk(req.params.id, {
      include: [
        { model: Job, as: 'job', include: [{ model: Company, as: 'company' }] },
        { model: User, as: 'seeker' },
      ],
    });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    // Ownership guard
    if (application.job.company.recruiter_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    await application.update({ status });

    // ── Create in-app notification ────────────────────────────────────────────
    await Notification.create({
      user_id: application.seeker_id,
      message: `Your application for "${application.job.title}" at ${application.job.company.name} has been updated to: ${status.toUpperCase()}.`,
    });

    // ── Send email (non-blocking) ─────────────────────────────────────────────
    if (['shortlisted', 'rejected', 'hired'].includes(status)) {
      sendApplicationStatusEmail({
        to: application.seeker.email,
        seekerName: application.seeker.name,
        jobTitle: application.job.title,
        companyName: application.job.company.name,
        newStatus: status,
      }).catch(console.error);
    }

    return res.status(200).json({ success: true, message: `Application status updated to ${status}.`, data: application });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/applications/:id — seeker withdraws application
exports.withdrawApplication = async (req, res, next) => {
  try {
    const application = await Application.findByPk(req.params.id);
    
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    
    if (application.seeker_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only withdraw your own applications.' });
    }

    if (application.status !== 'applied') {
      return res.status(400).json({ success: false, message: 'You can only withdraw applications that are in the "applied" status.' });
    }

    await application.destroy();
    
    return res.status(200).json({ success: true, message: 'Application withdrawn successfully.' });
  } catch (err) {
    next(err);
  }
};
