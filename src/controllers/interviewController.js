'use strict';

const { Op } = require('sequelize');
const { Interview, User, Notification, Application, Job, Company } = require('../models');
const aiService = require('../services/aiService');
const { scheduleInterviewExpiry } = require('../queues/interviewQueue');

// ─────────────────────────────────────────────────────────────────────────────
// Normalize a raw question object from the AI API into a consistent shape.
// Returns null if the question content is empty/missing (AI API bug guard).
// ─────────────────────────────────────────────────────────────────────────────
const normalizeQuestion = (q) => {
  if (!q) return null;
  // Guard: AI API sometimes returns questions with empty content strings
  if (!q.content || q.content.trim() === '') return null;
  return {
    id: q.question_id || q.id,
    question_type: q.type || q.question_type,
    content: q.content.trim(),
    difficulty: q.difficulty || null,
    // Always return options as an array (null for open/technical questions)
    options: Array.isArray(q.options) ? q.options : null,
  };
};

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

    // 3. Guard: each seeker may only take ONE interview per job (active OR completed)
    const existing = await Interview.findOne({
      where: {
        seeker_id: seekerId,
        job_id,
        api_version: 'v2',
      },
    });
    if (existing) {
      const isActive = !['completed', 'passed', 'failed'].includes(existing.status);
      return res.status(400).json({
        success: false,
        message: isActive
          ? 'You already have an active interview for this job.'
          : 'You have already completed the interview for this job. Only one attempt is allowed per job.',
        data: { interview_id: existing.id, status: existing.status },
      });
    }

    // 4. Look up the AI API's job_id using revup_id → local job_id mapping
    let aiJobId;
    try {
      aiJobId = await aiService.findAIJobId(job_id);
      console.log(`[DEBUG] Found Job ID: ${job.id}, aiJobId: ${aiJobId}`);
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
      const rawQuestion = await aiService.getNextAIQuestion(aiInterview.interview_id || aiInterview.id);
      firstQuestion = normalizeQuestion(rawQuestion);
      if (!firstQuestion) {
        return res.status(502).json({ success: false, message: 'Interview started but the first question could not be loaded. Please retry.' });
      }
    } catch {
      return res.status(502).json({ success: false, message: 'Interview started but failed to load first question. Please retry.' });
    }

    // 7. Save the session locally
    const interview = await Interview.create({
      seeker_id: seekerId,
      job_id,
      ai_interview_id: aiInterview.interview_id || aiInterview.id,
      status: 'in_progress',
      api_version: 'v2',
      answers: [],
    });

    // 8. Schedule auto-expiry in case the seeker abandons the interview
    if (scheduleInterviewExpiry) {
      await scheduleInterviewExpiry(interview.id).catch(console.error);
    }

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
      const rawQuestion = await aiService.getNextAIQuestion(interview.ai_interview_id);
      question = normalizeQuestion(rawQuestion);
    } catch {
      return res.status(502).json({ success: false, message: 'Failed to fetch question from AI service.' });
    }

    if (!question) {
      // ── EDGE CASE 1: Sync stuck interviews ──
      // The AI returned no question. This usually means the AI side is complete, but 
      // the local DB might still say "in_progress" if the final answer request crashed/dropped.
      // Let's attempt to fetch the report to confirm it's done, and auto-complete it locally.
      let report = null;
      try {
        report = await aiService.getAIReport(interview.ai_interview_id);
        if (report && typeof report === 'string') report = JSON.parse(report);
      } catch (err) {
        // Report not ready yet, just means it's still processing
      }

      if (report) {
        // Calculate the score from the existing answers
        const scores = (interview.answers || []).map((a) => a.score).filter((s) => typeof s === 'number');
        const totalScore = scores.length > 0
          ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100
          : null;

        const isFailed = totalScore !== null && totalScore < 60;
        const finalStatus = isFailed ? 'failed' : 'completed';

        await interview.update({
          report,
          total_score: totalScore,
          status: finalStatus,
        });

        // Auto-reject Application if failed
        if (isFailed && interview.job_id) {
          const application = await Application.findOne({
            where: { seeker_id: interview.seeker_id, job_id: interview.job_id }
          });
          if (application) {
            await application.update({
              status: 'rejected',
              rejection_reason: `Automatic rejection: Failed AI interview with a score of ${totalScore}%.`
            });
            // Notify seeker about the rejection
            await Notification.create({
              user_id: interview.seeker_id,
              message: `Unfortunately, you did not pass the AI interview. Your application has been rejected.`
            });
          }
        }

        // Notify recruiters of completion (only if not auto-failed)
        if (!isFailed) {
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
      }
      }

      return res.status(204).json({ success: false, message: 'No question available at this time. The interview is complete on the AI side.' });
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
    } catch (aiErr) {
      const status = aiErr.response?.status;
      const detail = aiErr.response?.data ?? aiErr.message;
      console.error(`[Interview] submitAIAnswer failed for ai_interview_id=${interview.ai_interview_id}`, { status, detail });

      // ── Detect duplicate submission (AI API returns 400 "already submitted") ──
      const aiMessage = typeof detail === 'object' ? detail?.detail : detail;
      if (status === 400 && typeof aiMessage === 'string' && aiMessage.toLowerCase().includes('already submitted')) {
        return res.status(409).json({
          success: false,
          message: 'This question has already been answered. Please fetch the next question and continue.',
        });
      }

      return res.status(502).json({
        success: false,
        message: 'AI grading service is currently unavailable.',
        debug: process.env.NODE_ENV === 'development' ? { status, detail } : undefined,
      });
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
      // The report takes 30-90s to generate on the AI side.
      // We do one quick fetch just in case, but expect it to fail. The frontend MUST poll /report.
      let report = null;
      try {
        report = await aiService.getAIReport(interview.ai_interview_id);
        // Ensure report is a plain object (not a string)
        if (report && typeof report === 'string') report = JSON.parse(report);
      } catch (reportErr) {
        console.log(`[Interview] AI report not ready yet for ai_interview_id=${interview.ai_interview_id}. Frontend will poll.`);
      }

      // Compute total_score as the mean of all answer scores
      const scores = updatedAnswers.map((a) => a.score).filter((s) => typeof s === 'number');
      const totalScore = scores.length > 0
        ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100
        : null;

      const isFailed = totalScore !== null && totalScore < 60;
      const finalStatus = isFailed ? 'failed' : 'completed';

      await interview.update({
        answers: updatedAnswers,
        report,
        total_score: totalScore,
        status: finalStatus,
      });

      // Auto-reject Application if failed
      if (isFailed && interview.job_id) {
        const application = await Application.findOne({
          where: { seeker_id: interview.seeker_id, job_id: interview.job_id }
        });
        if (application) {
          await application.update({
            status: 'rejected',
            rejection_reason: `Automatic rejection: Failed AI interview with a score of ${totalScore}%.`
          });
          await Notification.create({
            user_id: interview.seeker_id,
            message: `Unfortunately, you did not pass the AI interview. Your application has been rejected.`
          });
        }
      }

      // ── Notify recruiters of the company that posted the job ──────────────
      if (!isFailed) {
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
    let nextQuestionUnavailable = false;
    try {
      const rawNext = await aiService.getNextAIQuestion(interview.ai_interview_id);
      nextQuestion = normalizeQuestion(rawNext);
      // If AI returned a question but content was empty, flag it so frontend knows
      if (!nextQuestion && rawNext) nextQuestionUnavailable = true;
    } catch (nextErr) {
      // Non-fatal — frontend can call GET /:id/question as a fallback
      const status = nextErr.response?.status;
      const detail = nextErr.response?.data ?? nextErr.message;
      console.error(`[Interview] getNextAIQuestion failed after answer for ai_interview_id=${interview.ai_interview_id}`, { status, detail });
      nextQuestionUnavailable = true;
    }

    return res.status(200).json({
      success: true,
      data: {
        interview_id: interview.id,
        is_complete: false,
        evaluation,
        next_question: nextQuestion,
        // true = AI had a question but content was blank/unavailable;
        // frontend should retry GET /api/interview/:id/question
        next_question_unavailable: nextQuestionUnavailable,
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
      attributes: ['id', 'job_id', 'api_version', 'status', 'total_score', 'createdAt', 'updatedAt'],
      include: [{ model: Job, as: 'job', attributes: ['title'] }],
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
// GET /api/interview/:id/report — Get the AI report for a completed interview
// If report wasn't saved at completion time, re-fetches from AI and saves it.
// ─────────────────────────────────────────────────────────────────────────────
exports.getInterviewReport = async (req, res, next) => {
  try {
    const interview = await Interview.findByPk(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });

    // Seeker can only view their own; recruiter access handled by getApplicantInterview
    if (req.user.role === 'seeker' && interview.seeker_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This is not your interview.' });
    }

    if (!['completed', 'passed', 'failed'].includes(interview.status)) {
      return res.status(400).json({ success: false, message: 'Report is only available after the interview is completed.' });
    }

    // If report is already stored, return it immediately
    if (interview.report) {
      // Parse if stored as a JSON string
      const reportObj = typeof interview.report === 'string'
        ? JSON.parse(interview.report)
        : interview.report;
      return res.status(200).json({
        success: true,
        data: {
          interview_id: interview.id,
          status: interview.status,
          total_score: interview.total_score,
          report: reportObj,
          answers: interview.answers,
        },
      });
    }

    // Report is null — try to re-fetch from AI API and save it
    let report = null;
    try {
      report = await aiService.getAIReport(interview.ai_interview_id);
      // Ensure report is a plain object (not a string) before saving
      if (report && typeof report === 'string') report = JSON.parse(report);
      if (report) await interview.update({ report });
    } catch (reportErr) {
      const status = reportErr.response?.status;
      const detail = reportErr.response?.data ?? reportErr.message;
      console.error(`[Interview] getAIReport re-fetch failed for ai_interview_id=${interview.ai_interview_id}`, { status, detail });
    }

    if (!report) {
      return res.status(502).json({
        success: false,
        message: 'Report is not yet available. The AI system may still be processing. Please try again in a moment.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        interview_id: interview.id,
        status: interview.status,
        total_score: interview.total_score,
        report,
        answers: interview.answers,
      },
    });
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

    // Single JOIN query: check if seeker applied to ANY of this company's jobs
    // This replaces the old pattern of: Job.findAll → map IDs → Application.findOne (N+1)
    const hasApplied = await Application.findOne({
      where: { seeker_id: seekerId },
      include: [{
        model: Job,
        as: 'job',
        attributes: [],
        where: { company_id: company.id },
        required: true,  // INNER JOIN — only match if the job belongs to this company
      }],
    });
    if (!hasApplied) return res.status(403).json({ success: false, message: 'You can only view interviews of seekers who applied to your jobs.' });

    // Single JOIN query: fetch interviews only for jobs owned by this company
    // This replaces the old pattern of: Job.findAll → map IDs → Interview.findAll with IN clause
    const interviews = await Interview.findAll({
      where: { seeker_id: seekerId },
      include: [{
        model: Job,
        as: 'job',
        attributes: ['id', 'title'],
        where: { company_id: company.id },
        required: true,  // INNER JOIN — only return interviews for this company's jobs
      }],
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

    if (interview.job_id) {
      const application = await Application.findOne({
        where: { seeker_id: interview.seeker_id, job_id: interview.job_id }
      });
      if (application) {
        await application.update({
          status: decision === 'passed' ? 'shortlisted' : 'rejected',
          rejection_reason: decision === 'failed' ? 'Did not pass recruiter review of AI interview.' : null
        });
      }
    }

    // Notify the seeker
    const jobLabel = interview.job_id
      ? (await Job.findByPk(interview.job_id, { attributes: ['title'] }))?.title || 'the position'
      : 'the position';

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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/interview/:id/question/:questionId/stream
// Proxy the AI API's SSE stream of a question's text directly to the client
// ─────────────────────────────────────────────────────────────────────────────
exports.streamQuestion = async (req, res, next) => {
  try {
    const interview = await Interview.findByPk(req.params.id, {
      attributes: ['id', 'seeker_id', 'ai_interview_id', 'status'],
    });

    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    if (interview.seeker_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This is not your interview.' });
    }
    if (interview.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'This interview is not in progress.' });
    }

    const { questionId } = req.params;

    let stream;
    try {
      stream = await aiService.streamAIQuestion(interview.ai_interview_id, questionId);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data ?? err.message;
      console.error(`[Interview] streamAIQuestion failed for ai_interview_id=${interview.ai_interview_id}`, { status, detail });
      return res.status(502).json({ success: false, message: 'AI streaming service is currently unavailable.' });
    }

    // Set headers for SSE / plain-text streaming
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no', // disable nginx buffering on Railway/Render
    });

    // Pipe AI stream → client; handle errors gracefully
    stream.pipe(res);
    stream.on('error', (streamErr) => {
      console.error(`[Interview] Stream error for ai_interview_id=${interview.ai_interview_id}:`, streamErr.message);
      if (!res.writableEnded) res.end();
    });
  } catch (err) {
    next(err);
  }
};
