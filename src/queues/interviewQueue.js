'use strict';

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { Interview, Job, User, Notification } = require('../models');
const logger = require('../config/logger');

let scheduleInterviewExpiry = async () => {};

if (!process.env.REDIS_URL) {
  logger.warn('[InterviewQueue] REDIS_URL not set — abandoned interview expiry is disabled');
} else {
  const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  connection.on('connect', () => logger.info('[InterviewQueue] Redis connected'));
  connection.on('error', (err) => logger.error(`[InterviewQueue] Redis error: ${err.message}`));

  // ─── Queue ────────────────────────────────────────────────────────────────────
  const interviewQueue = new Queue('interviews', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });

  // ─── Worker ───────────────────────────────────────────────────────────────────
  const interviewWorker = new Worker('interviews', async (job) => {
    const { interview_id } = job.data;
    
    const interview = await Interview.findByPk(interview_id, {
      include: [{ model: User, as: 'seeker', attributes: ['name'] }]
    });

    if (!interview) return;

    // If the interview is STILL in progress after 24 hours, mark it as abandoned/failed
    if (interview.status === 'in_progress') {
      logger.info(`[InterviewQueue] Auto-expiring abandoned interview ${interview_id}`);
      
      await interview.update({
        status: 'failed',
        total_score: 0, // Auto-fail score
      });

      // Notify the seeker
      const jobRecord = interview.job_id 
        ? await Job.findByPk(interview.job_id, { attributes: ['title'] }) 
        : null;
      const jobLabel = jobRecord ? jobRecord.title : 'the position';

      await Notification.create({
        user_id: interview.seeker_id,
        message: `Your AI interview for ${jobLabel} was abandoned and has been automatically marked as incomplete.`,
      });
    }
  }, { connection });

  interviewWorker.on('failed', (job, err) => {
    logger.error(`[InterviewQueue] Job ${job.id} failed: ${err.message}`);
  });

  // ─── Helper ───────────────────────────────────────────────────────────────────
  scheduleInterviewExpiry = async (interview_id, delayMs = 24 * 60 * 60 * 1000) => { // 24 hours
    await interviewQueue.add('expire', { interview_id }, { delay: delayMs });
  };
}

module.exports = { scheduleInterviewExpiry };
