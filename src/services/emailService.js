'use strict';

const transporter = require('../config/mailer');

/**
 * Send a Welcome email on registration
 */
const sendWelcomeEmail = async ({ to, name }) => {
  await transporter.sendMail({
    from: `"RevUp" <${process.env.GMAIL_USER}>`,
    to,
    subject: ' Welcome to RevUp!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border-radius: 8px; background: #f9f9f9;">
        <h2 style="color: #4F46E5;">Welcome to RevUp, ${name}! </h2>
        <p style="color: #333;">Your account has been created successfully. Start exploring thousands of job opportunities today.</p>
        <a href="${process.env.CLIENT_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">Go to RevUp</a>
        <p style="margin-top:24px;font-size:12px;color:#999;">If you didn't create this account, please ignore this email.</p>
      </div>
    `,
  });
};

/**
 * Send a Password Reset email
 */
const sendPasswordResetEmail = async ({ to, name, resetToken }) => {
  const resetUrl = `${process.env.CLIENT_URL}/api/auth/reset-password/${resetToken}`;
  await transporter.sendMail({
    from: `"RevUp" <${process.env.GMAIL_USER}>`,
    to,
    subject: ' RevUp — Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border-radius: 8px; background: #f9f9f9;">
        <h2 style="color: #4F46E5;">Password Reset Request</h2>
        <p style="color: #333;">Hi <strong>${name}</strong>,</p>
        <p style="color: #333;">We received a request to reset your password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#DC2626;color:#fff;border-radius:6px;text-decoration:none;">Reset My Password</a>
        <p style="margin-top:16px;color:#555;font-size:13px;">Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
        <p style="margin-top:24px;font-size:12px;color:#999;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
};

/**
 * Send Application Status Change email to seeker
 */
const sendApplicationStatusEmail = async ({ to, seekerName, jobTitle, companyName, newStatus }) => {
  const statusConfig = {
    shortlisted: { emoji: '🌟', color: '#059669', text: 'Congratulations! You have been shortlisted.' },
    rejected:    { emoji: '📋', color: '#DC2626', text: 'Unfortunately, your application was not selected at this time.' },
    hired:       { emoji: '🎉', color: '#4F46E5', text: 'Congratulations! You have been hired!' },
    applied:     { emoji: '✅', color: '#6B7280', text: 'Your application status has been updated.' },
  };

  const config = statusConfig[newStatus] || statusConfig['applied'];

  await transporter.sendMail({
    from: `"RevUp" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${config.emoji} Application Update — ${jobTitle} at ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border-radius: 8px; background: #f9f9f9;">
        <h2 style="color: ${config.color};">${config.emoji} Application Status Update</h2>
        <p style="color: #333;">Hi <strong>${seekerName}</strong>,</p>
        <p style="color: #333;">Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been updated.</p>
        <div style="margin: 20px 0; padding: 16px; background: #fff; border-left: 4px solid ${config.color}; border-radius: 4px;">
          <p style="margin:0; font-size: 16px; color: ${config.color}; font-weight: bold;">Status: ${newStatus.toUpperCase()}</p>
          <p style="margin-top:8px; color: #555;">${config.text}</p>
        </div>
        <a href="${process.env.CLIENT_URL}/applications" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">View My Applications</a>
        <p style="margin-top:24px;font-size:12px;color:#999;">Sent via RevUp Job Portal</p>
      </div>
    `,
  });
};

/**
 * Send Interview Schedule email to seeker
 */
const sendInterviewScheduleEmail = async ({ to, seekerName, track, scheduledAt, location, notes, recruiterName }) => {
  const dateStr = new Date(scheduledAt).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  await transporter.sendMail({
    from: `"RevUp" <${process.env.GMAIL_USER}>`,
    to,
    subject: `🗓️ Your ${track} Interview Has Been Scheduled — RevUp`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border-radius: 8px; background: #f9f9f9;">
        <h2 style="color: #4F46E5;">🗓️ Interview Scheduled!</h2>
        <p style="color: #333;">Hi <strong>${seekerName}</strong>,</p>
        <p style="color: #333;">Congratulations on passing your AI interview! Your real interview has been scheduled for the <strong>${track}</strong> track.</p>
        <div style="margin: 20px 0; padding: 20px; background: #fff; border-left: 4px solid #4F46E5; border-radius: 4px;">
          <p style="margin: 0 0 8px; color: #4F46E5; font-weight: bold; font-size: 16px;">📅 Date & Time</p>
          <p style="margin: 0 0 16px; color: #333;">${dateStr}</p>
          ${location ? `
          <p style="margin: 0 0 8px; color: #4F46E5; font-weight: bold; font-size: 16px;">📍 Location / Link</p>
          <p style="margin: 0 0 16px; color: #333;">${location}</p>
          ` : ''}
          ${notes ? `
          <p style="margin: 0 0 8px; color: #4F46E5; font-weight: bold; font-size: 16px;">📝 Notes from Recruiter</p>
          <p style="margin: 0; color: #555;">${notes}</p>
          ` : ''}
        </div>
        <p style="color: #333;">Scheduled by: <strong>${recruiterName}</strong></p>
        <a href="${process.env.CLIENT_URL}/my-schedule" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">View My Schedule</a>
        <p style="margin-top:24px;font-size:12px;color:#999;">Good luck! The RevUp Team</p>
      </div>
    `,
  });
};

/**
 * Send Interview Cancellation email to seeker
 */
const sendInterviewCancelledEmail = async ({ to, seekerName, track, scheduledAt, reason }) => {
  const dateStr = new Date(scheduledAt).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  await transporter.sendMail({
    from: `"RevUp" <${process.env.GMAIL_USER}>`,
    to,
    subject: `❌ Interview Cancelled — ${track} — RevUp`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border-radius: 8px; background: #f9f9f9;">
        <h2 style="color: #DC2626;">❌ Interview Cancelled</h2>
        <p style="color: #333;">Hi <strong>${seekerName}</strong>,</p>
        <p style="color: #333;">We're sorry to inform you that your interview scheduled for the <strong>${track}</strong> track on <strong>${dateStr}</strong> has been cancelled.</p>
        ${reason ? `<p style="color: #555;">Reason: <em>${reason}</em></p>` : ''}
        <p style="color: #333;">Please check RevUp for further updates or contact your recruiter.</p>
        <a href="${process.env.CLIENT_URL}/my-schedule" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">View My Schedule</a>
        <p style="margin-top:24px;font-size:12px;color:#999;">The RevUp Team</p>
      </div>
    `,
  });
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendApplicationStatusEmail,
  sendInterviewScheduleEmail,
  sendInterviewCancelledEmail,
};
