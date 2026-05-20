'use strict';

const axios = require('axios');
const { Op } = require('sequelize');
const { Interview, User, Notification, Application, Job } = require('../models');

const AI_API_BASE = 'https://interview-production-ee82.up.railway.app';

const VALID_TRACKS = ['Frontend', 'Backend', 'AI Engineering', 'Data Engineering'];

// ── Helper: compute a single total_score from the AI report ──────────────────
const computeTotalScore = (report) => {
  try {
    let totalPoints = 0;
    let maxPoints = 0;

    const mcqGrades = report.mcq_grades || {};
    for (const key of Object.keys(mcqGrades)) {
      totalPoints += mcqGrades[key].score || 0;
      maxPoints += 1;
    }

    const writtenGrades = report.written_grades || {};
    for (const key of Object.keys(writtenGrades)) {
      totalPoints += writtenGrades[key].score || 0;
      maxPoints += 1;
    }

    if (maxPoints === 0) return 0;
    return Math.round((totalPoints / maxPoints) * 100);
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/interview/start — Seeker starts an AI interview
// ─────────────────────────────────────────────────────────────────────────────
exports.startInterview = async (req, res, next) => {
  try {
    const { track } = req.body;

    if (!track || !VALID_TRACKS.includes(track)) {
      return res.status(400).json({
        success: false,
        message: `Invalid track. Must be one of: ${VALID_TRACKS.join(', ')}`,
      });
    }

    // Proxy to AI API
    let aiResponse;
    try {
      const { data } = await axios.post(`${AI_API_BASE}/interview/start`, { track }, {
        timeout: 60000, // AI generation can take up to 60s
      });
      aiResponse = data;
    } catch (aiErr) {
      return res.status(502).json({
        success: false,
        message: 'AI interview service is currently unavailable. Please try again later.',
      });
    }

    // Save session to DB
    const interview = await Interview.create({
      seeker_id: req.user.id,
      track,
      status: 'pending',
      questions: aiResponse,
    });

    return res.status(201).json({
      success: true,
      message: 'Interview started! Good luck.',
      data: {
        interview_id: interview.id,
        track: interview.track,
        questions: aiResponse,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/interview/submit — Seeker submits answers
// ─────────────────────────────────────────────────────────────────────────────
exports.submitInterview = async (req, res, next) => {
  try {
    const { interview_id, mcq_answers, written_answers } = req.body;

    const interview = await Interview.findByPk(interview_id);
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found.' });
    }
    if (interview.seeker_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This is not your interview session.' });
    }
    if (interview.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This interview has already been submitted.' });
    }

    // Proxy to AI API for grading
    let aiReport;
    try {
      const { data } = await axios.post(`${AI_API_BASE}/interview/submit`, {
        track: interview.track,
        mcq_answers,
        written_answers,
      }, { timeout: 120000 }); // grading can take longer
      aiReport = data;
    } catch (aiErr) {
      return res.status(502).json({
        success: false,
        message: 'AI grading service is currently unavailable. Please try again later.',
      });
    }

    const totalScore = computeTotalScore(aiReport.report);

    // Update the interview record
    await interview.update({
      status: 'submitted',
      mcq_answers,
      written_answers,
      report: aiReport.report,
      total_score: totalScore,
    });

    // ── Smart Recruiter Notification ────────────────────────────────────────
    // Only notify recruiters from companies the seeker has applied to,
    // not every single recruiter on the platform.
    const seekerApplications = await Application.findAll({
      where: { seeker_id: req.user.id },
      include: [{
        model: Job,
        as: 'job',
        attributes: ['company_id'],
      }],
    });

    const companyIds = [...new Set(
      seekerApplications
        .filter(app => app.job)
        .map(app => app.job.company_id)
    )];

    let recruiters = [];
    if (companyIds.length > 0) {
      // Find recruiters belonging to those companies
      recruiters = await User.findAll({
        where: {
          role: 'recruiter',
          company_id: { [Op.in]: companyIds },
        },
        attributes: ['id'],
      });
    }

    // Fallback: if seeker hasn't applied anywhere yet, notify all recruiters
    if (recruiters.length === 0) {
      recruiters = await User.findAll({
        where: { role: 'recruiter' },
        attributes: ['id'],
      });
    }

    const notifications = recruiters.map((recruiter) => ({
      user_id: recruiter.id,
      message: `${req.user.name} has completed their AI interview for the ${interview.track} track. Score: ${totalScore ?? 'N/A'}%. Please review their results.`,
    }));
    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications);
    }

    return res.status(200).json({
      success: true,
      message: 'Interview submitted successfully! Your results are under review.',
      data: {
        interview_id: interview.id,
        track: interview.track,
        status: 'submitted',
        total_score: totalScore,
        report: aiReport.report,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/interview/my-history — Seeker sees their own interview history
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyInterviews = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await Interview.findAndCountAll({
      where: { seeker_id: req.user.id },
      attributes: ['id', 'track', 'status', 'total_score', 'createdAt', 'updatedAt'],
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
// GET /api/interview/my-history/:id — Seeker sees full detail of one interview
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyInterviewDetail = async (req, res, next) => {
  try {
    const interview = await Interview.findByPk(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    if (interview.seeker_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only view your own interviews.' });
    }

    return res.status(200).json({ success: true, data: interview });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/interview/applicant/:seekerId — Recruiter views a seeker's interview
// ─────────────────────────────────────────────────────────────────────────────
exports.getApplicantInterview = async (req, res, next) => {
  try {
    const seekerId = parseInt(req.params.seekerId);

    const seeker = await User.findByPk(seekerId, {
      attributes: ['id', 'name', 'email', 'profile_pic'],
    });
    if (!seeker) return res.status(404).json({ success: false, message: 'Seeker not found.' });

    // Get their most recent submitted interview (or all)
    const interviews = await Interview.findAll({
      where: { seeker_id: seekerId },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: {
        seeker,
        interviews,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/interview/:id/decision — Recruiter decides: passed or failed
// ─────────────────────────────────────────────────────────────────────────────
exports.makeDecision = async (req, res, next) => {
  try {
    const { decision } = req.body;

    if (!['passed', 'failed'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Decision must be either "passed" or "failed".',
      });
    }

    const interview = await Interview.findByPk(req.params.id, {
      include: [{ model: User, as: 'seeker', attributes: ['id', 'name', 'email'] }],
    });

    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });

    if (interview.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'You can only make a decision on submitted interviews.',
      });
    }

    await interview.update({ status: decision });

    // Notify the seeker
    let notificationMsg;
    if (decision === 'passed') {
      notificationMsg = `🎉 Congratulations, ${interview.seeker.name}! You passed the AI interview for the ${interview.track} track. You will be scheduled for a real interview soon.`;
    } else {
      notificationMsg = `Thank you for your effort, ${interview.seeker.name}. Unfortunately, you did not pass the AI interview for the ${interview.track} track. Keep learning and try again!`;
    }

    await Notification.create({
      user_id: interview.seeker_id,
      message: notificationMsg,
    });

    return res.status(200).json({
      success: true,
      message: `Interview marked as ${decision}. Seeker has been notified.`,
      data: {
        interview_id: interview.id,
        seeker: interview.seeker.name,
        track: interview.track,
        status: decision,
        total_score: interview.total_score,
      },
    });
  } catch (err) {
    next(err);
  }
};
