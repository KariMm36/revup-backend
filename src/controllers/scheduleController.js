'use strict';

const { InterviewSchedule, Interview, User, Notification } = require('../models');
const { sendInterviewScheduleEmail, sendInterviewCancelledEmail } = require('../services/emailService');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/schedule — Recruiter schedules a real interview for a passed seeker
// ─────────────────────────────────────────────────────────────────────────────
exports.scheduleInterview = async (req, res, next) => {
  try {
    const { interview_id, scheduled_at, location, notes } = req.body;

    if (!interview_id || !scheduled_at) {
      return res.status(400).json({
        success: false,
        message: 'interview_id and scheduled_at are required.',
      });
    }

    // Verify the interview exists and is in "passed" status
    const interview = await Interview.findByPk(interview_id, {
      include: [{ model: User, as: 'seeker', attributes: ['id', 'name', 'email'] }],
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found.' });
    }
    if (interview.status !== 'passed') {
      return res.status(400).json({
        success: false,
        message: 'You can only schedule interviews for seekers who passed the AI interview.',
      });
    }

    // Check if already scheduled
    const existing = await InterviewSchedule.findOne({ where: { interview_id } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This interview has already been scheduled. Update it instead.',
      });
    }

    const schedule = await InterviewSchedule.create({
      interview_id,
      seeker_id: interview.seeker_id,
      recruiter_id: req.user.id,
      scheduled_at,
      location: location || null,
      notes: notes || null,
      status: 'pending',
    });

    // In-app notification to seeker
    await Notification.create({
      user_id: interview.seeker_id,
      message: `📅 Your real interview for the ${interview.track} track has been scheduled on ${new Date(scheduled_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}. ${location ? `Location: ${location}` : ''} Check your email for details!`,
    });

    // Email notification (non-blocking)
    sendInterviewScheduleEmail({
      to: interview.seeker.email,
      seekerName: interview.seeker.name,
      track: interview.track,
      scheduledAt: scheduled_at,
      location,
      notes,
      recruiterName: req.user.name,
    }).catch(console.error);

    return res.status(201).json({
      success: true,
      message: `Interview scheduled for ${interview.seeker.name}. They have been notified via app and email.`,
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/schedule/my-schedule — Seeker sees their own scheduled interviews
// ─────────────────────────────────────────────────────────────────────────────
exports.getMySchedule = async (req, res, next) => {
  try {
    const schedules = await InterviewSchedule.findAll({
      where: { seeker_id: req.user.id },
      include: [
        {
          model: Interview,
          as: 'interview',
          attributes: ['id', 'track', 'total_score', 'status'],
        },
        {
          model: User,
          as: 'recruiter',
          attributes: ['id', 'name', 'email', 'profile_pic'],
        },
      ],
      order: [['scheduled_at', 'ASC']],
    });

    return res.status(200).json({ success: true, data: schedules });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/schedule — Recruiter sees all schedules they created
// ─────────────────────────────────────────────────────────────────────────────
exports.getRecruiterSchedules = async (req, res, next) => {
  try {
    const schedules = await InterviewSchedule.findAll({
      where: { recruiter_id: req.user.id },
      include: [
        {
          model: Interview,
          as: 'interview',
          attributes: ['id', 'track', 'total_score'],
        },
        {
          model: User,
          as: 'seeker',
          attributes: ['id', 'name', 'email', 'profile_pic'],
        },
      ],
      order: [['scheduled_at', 'ASC']],
    });

    return res.status(200).json({ success: true, data: schedules });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/schedule/:id — Recruiter updates schedule (time, location, notes)
// ─────────────────────────────────────────────────────────────────────────────
exports.updateSchedule = async (req, res, next) => {
  try {
    const { scheduled_at, location, notes, status } = req.body;

    const schedule = await InterviewSchedule.findByPk(req.params.id, {
      include: [
        { model: Interview, as: 'interview', attributes: ['track'] },
        { model: User, as: 'seeker', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found.' });

    if (schedule.recruiter_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only update schedules you created.' });
    }

    const updates = {};
    if (scheduled_at) updates.scheduled_at = scheduled_at;
    if (location !== undefined) updates.location = location;
    if (notes !== undefined) updates.notes = notes;
    if (status && ['pending', 'confirmed', 'completed'].includes(status)) updates.status = status;

    await schedule.update(updates);

    // Notify seeker of the update
    await Notification.create({
      user_id: schedule.seeker_id,
      message: `📅 Your scheduled interview for the ${schedule.interview.track} track has been updated. Please check the new details.`,
    });

    return res.status(200).json({
      success: true,
      message: 'Schedule updated. Seeker has been notified.',
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/schedule/:id — Recruiter cancels a scheduled interview
// ─────────────────────────────────────────────────────────────────────────────
exports.cancelSchedule = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const schedule = await InterviewSchedule.findByPk(req.params.id, {
      include: [
        { model: Interview, as: 'interview', attributes: ['track'] },
        { model: User, as: 'seeker', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found.' });

    if (schedule.recruiter_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only cancel schedules you created.' });
    }

    if (schedule.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This schedule is already cancelled.' });
    }

    await schedule.update({ status: 'cancelled' });

    // In-app notification
    await Notification.create({
      user_id: schedule.seeker_id,
      message: `❌ Your scheduled interview for the ${schedule.interview.track} track has been cancelled. ${reason ? `Reason: ${reason}` : ''} Please check RevUp for updates.`,
    });

    // Email notification (non-blocking)
    sendInterviewCancelledEmail({
      to: schedule.seeker.email,
      seekerName: schedule.seeker.name,
      track: schedule.interview.track,
      scheduledAt: schedule.scheduled_at,
      reason,
    }).catch(console.error);

    return res.status(200).json({
      success: true,
      message: 'Schedule cancelled. Seeker has been notified.',
    });
  } catch (err) {
    next(err);
  }
};
