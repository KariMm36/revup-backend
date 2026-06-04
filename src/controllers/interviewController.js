'use strict';

const { Op } = require('sequelize');
const { Interview, User, Notification, Application, Job, Company } = require('../models');
const aiService = require('../services/aiService');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/interview/start
// Seeker starts a conversational AI interview for a job they applied to
// ─────────────────────────────────────────────────────────────────────────────
exports.startInterview = async (req, res, next) => {
  try {
    const { job_id } = req.body;
    const seekerId = req.user.id;

    // 1. Validate the job exists locally
    const job = await Job.findByPk(job_id, { attributes: ['id', 'title', 'company_id'] });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // 2. Confirm the seeker has applied to this job
    const application = await Application.findOne({
      where: { seeker_id: seekerId, job_id },
    });
    if (!application) {
      return res.status(403).json({
        success: false,
        message: 'You can only start an interview for a job you have applied to.',
      });
    }

    // 3. Guard: only one active interview per job
    const existing = await Interview.findOne({
      where: {
        seeker_id: seekerId,
        job_id,
        api_version: 'v2',
        status: { [Op.notIn]: ['completed', 'passed', 'failed'] },
      },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active interview for this job.',
        data: { interview_id: existing.id },
      });
    }

    // 4. Look up the AI API's job_id using revup_id → local job_id mapping
    let aiJobId;
    try {
      aiJobId = await aiService.findAIJobId(job_id);
    } catch {
      return res.status(502).json({ success: false, message: 'AI interview service is currently unavailable.' });
    }

    if (!aiJobId) {
      return res.status(404).json({
        success: false,
        message: 'This job is not yet available in the AI interview system. Please contact support.',
      });
    }

    // 5. Start the interview on the AI platform
    let aiInterview;
    try {
      aiInterview = await aiService.startAIInterview(aiJobId, req.user.name, req.user.email);
    } catch {
      return res.status(502).json({ success: false, message: 'Failed to start AI interview. Please try again.' });
    }

    // 6. Fetch the first question immediately
    let firstQuestion;
    try {
      firstQuestion = await aiService.getNextAIQuestion(aiInterview.id);
    } catch {
      return res.status(502).json({ success: false, message: 'Interview started but failed to load first question. Please retry.' });
    }

    // 7. Save the session locally
    const interview = await Interview.create({
      seeker_id: seekerId,
      job_id,
      ai_interview_id: aiInterview.id,
      status: 'in_progress',
      api_version: 'v2',
      answers: [],
    });

    return res.status(201).json({
      success: true,
      message: `Interview started for "${job.title}". Good luck!`,
      data: {
        interview_id: interview.id,
        job_id,
        job_title: job.title,
        question: firstQuestion,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/interview/:id/question
// Get the next unanswered question for an ongoing interview
// ─────────────────────────────────────────────────────────────────────────────
exports.getNextQuestion = async (req, res, next) => {
  try {
    const interview = await Interview.findByPk(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    if (interview.seeker_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This is not your interview.' });
    }
    if (interview.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'This interview is not in progress.' });
    }

    let question;
    try {
      question = await aiService.getNextAIQuestion(interview.ai_interview_id);
    } catch {
      return res.status(502).json({ success: false, message: 'Failed to fetch question from AI service.' });
    }

    return res.status(200).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/interview/:id/answer
// Submit one answer — get immediate evaluation, auto-finalize when done
// ─────────────────────────────────────────────────────────────────────────────
exports.submitAnswer = async (req, res, next) => {
  try {
    const { question_id, answer, time_taken_seconds } = req.body;

    const interview = await Interview.findByPk(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    if (interview.seeker_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This is not your interview.' });
    }
    if (interview.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'This interview is not in progress.' });
    }

    // Proxy to AI API
    let aiResponse;
    try {
      aiResponse = await aiService.submitAIAnswer(interview.ai_interview_id, {
        question_id,
        answer,
        time_taken_seconds,
      });
    } catch {
      return res.status(502).json({ success: false, message: 'AI grading service is currently unavailable.' });
    }

    const { evaluation, is_complete } = aiResponse;

    // Accumulate this answer's result
    const updatedAnswers = [
      ...(interview.answers || []),
      {
        question_id,
        answer,
        time_taken_seconds,
        score: evaluation.score,
        feedback: evaluation.feedback,
        ai_probability: evaluation.ai_probability,
      },
    ];

    // If interview is complete, finalize
    if (is_complete) {
      // Fetch the full report from AI
      let report = null;
      try {
        report = await aiService.getAIReport(interview.ai_interview_id);
      } catch {
        // Non-fatal — we still mark completed
      }

      // Compute total_score as the mean of all answer scores
      const scores = updatedAnswers.map((a) => a.score).filter((s) => typeof s === 'number');
      const totalScore = scores.length > 0
        ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100
        : null;

      await interview.update({
        answers: updatedAnswers,
        report,
        total_score: totalScore,
        status: 'completed',
      });

      // ── Notify recruiters of the company that posted the job ──────────────
      const jobRecord = await Job.findByPk(interview.job_id, { attributes: ['company_id', 'title'] });
      if (jobRecord) {
        const recruiters = await User.findAll({
          where: { role: 'recruiter', company_id: jobRecord.company_id },
          attributes: ['id'],
        });
        if (recruiters.length > 0) {
          await Notification.bulkCreate(
            recruiters.map((r) => ({
              user_id: r.id,
              message: `${req.user.name} has completed their AI interview for "${jobRecord.title}". Score: ${totalScore ?? 'N/A'}%. Please review and make a decision.`,
            }))
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Interview completed! Your results are under review.',
        data: {
          interview_id: interview.id,
          is_complete: true,
          evaluation,
          total_score: totalScore,
          report,
        },
      });
    }

    // Interview still in progress — return evaluation + fetch next question
    await interview.update({ answers: updatedAnswers });

    let nextQuestion = null;
    try {
      nextQuestion = await aiService.getNextAIQuestion(interview.ai_interview_id);
    } catch {
      // Non-fatal — frontend can call GET /question separately
    }

    return res.status(200).json({
      success: true,
      data: {
        interview_id: interview.id,
        is_complete: false,
        evaluation,
        next_question: nextQuestion,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/interview/:id/track
// Report a real-time cheat event during the interview
// ─────────────────────────────────────────────────────────────────────────────
exports.trackCheatEvent = async (req, res, next) => {
  try {
    const { event_type, details } = req.body;

    const interview = await Interview.findByPk(req.params.id, { attributes: ['id', 'seeker_id', 'ai_interview_id', 'status'] });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    if (interview.seeker_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This is not your interview.' });
    }
    if (interview.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Interview is not in progress.' });
    }

    try {
      await aiService.trackAICheatEvent(interview.ai_interview_id, { event_type, details });
    } catch {
      // Best-effort — don't block the candidate
    }

    return res.status(200).json({ success: true, message: 'Event recorded.' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/interview/my-history — Seeker's own interview history (paginated)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyInterviews = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await Interview.findAndCountAll({
      where: { seeker_id: req.user.id },
      attributes: ['id', 'job_id', 'track', 'api_version', 'status', 'total_score', 'createdAt', 'updatedAt'],
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
// GET /api/interview/my-history/:id — Full detail of one interview
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
// GET /api/interview/applicant/:seekerId — Recruiter views a seeker's interviews
// ─────────────────────────────────────────────────────────────────────────────
exports.getApplicantInterview = async (req, res, next) => {
  try {
    const seekerId = parseInt(req.params.seekerId);

    const seeker = await User.findByPk(seekerId, {
      attributes: ['id', 'name', 'email', 'profile_pic'],
    });
    if (!seeker) return res.status(404).json({ success: false, message: 'Seeker not found.' });

    // Privacy guard: support both company owner and assigned recruiter
    let company = await Company.findOne({ where: { recruiter_id: req.user.id } });
    if (!company && req.user.company_id) {
      company = await Company.findByPk(req.user.company_id);
    }
    if (!company) return res.status(403).json({ success: false, message: 'You are not associated with any company.' });

    const recruiterJobIds = (await Job.findAll({ where: { company_id: company.id }, attributes: ['id'] })).map(j => j.id);
    if (recruiterJobIds.length === 0) return res.status(403).json({ success: false, message: 'Access denied.' });

    const hasApplied = await Application.findOne({ where: { seeker_id: seekerId, job_id: recruiterJobIds } });
    if (!hasApplied) return res.status(403).json({ success: false, message: 'You can only view interviews of seekers who applied to your jobs.' });

    // Return only interviews for jobs owned by this recruiter's company
    const interviews = await Interview.findAll({
      where: {
        seeker_id: seekerId,
        job_id: recruiterJobIds,
      },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: { seeker, interviews },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/interview/:id/decision — Recruiter makes pass/fail decision
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

    // Only allow decisions on completed/submitted interviews
    if (!['completed', 'submitted'].includes(interview.status)) {
      return res.status(400).json({
        success: false,
        message: 'You can only make a decision on a completed interview.',
      });
    }

    // Verify the recruiter's company owns the job
    let company = await Company.findOne({ where: { recruiter_id: req.user.id } });
    if (!company && req.user.company_id) {
      company = await Company.findByPk(req.user.company_id);
    }
    if (!company) return res.status(403).json({ success: false, message: 'You are not associated with any company.' });

    if (interview.job_id) {
      const job = await Job.findByPk(interview.job_id, { attributes: ['company_id', 'title'] });
      if (job && job.company_id !== company.id) {
        return res.status(403).json({ success: false, message: 'You can only decide on interviews for your company\'s jobs.' });
      }
    }

    await interview.update({ status: decision });

    // Notify the seeker
    const jobLabel = interview.job_id
      ? (await Job.findByPk(interview.job_id, { attributes: ['title'] }))?.title || 'the position'
      : (interview.track ? `the ${interview.track} track` : 'the position');

    const notificationMsg = decision === 'passed'
      ? `🎉 Congratulations, ${interview.seeker.name}! You passed the AI interview for ${jobLabel}. You will be scheduled for a real interview soon.`
      : `Thank you for your effort, ${interview.seeker.name}. Unfortunately, you did not pass the AI interview for ${jobLabel}. Keep learning and try again!`;

    await Notification.create({ user_id: interview.seeker_id, message: notificationMsg });

    return res.status(200).json({
      success: true,
      message: `Interview marked as ${decision}. Seeker has been notified.`,
      data: {
        interview_id: interview.id,
        seeker: interview.seeker.name,
        status: decision,
        total_score: interview.total_score,
      },
    });
  } catch (err) {
    next(err);
  }
};
