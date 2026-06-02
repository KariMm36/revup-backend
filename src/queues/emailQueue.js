'use strict';

const { Queue, Worker } = require('bullmq');
const transporter = require('../config/mailer');
const logger = require('../config/logger');

// BullMQ requires Redis — skip gracefully if not configured
if (!process.env.REDIS_URL) {
  logger.warn('[EmailQueue] REDIS_URL not set — email queue is disabled, emails will send inline');
  module.exports = { addToEmailQueue: null };
  return;
}

const connection = { url: process.env.REDIS_URL };

// ─── Queue ────────────────────────────────────────────────────────────────────
const emailQueue = new Queue('emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,                          // retry up to 3 times on failure
    backoff: { type: 'exponential', delay: 5000 }, // wait 5s, 10s, 20s between retries
    removeOnComplete: 100,                // keep last 100 completed jobs
    removeOnFail: 50,                     // keep last 50 failed jobs for debugging
  },
});

// ─── Worker ───────────────────────────────────────────────────────────────────
const emailWorker = new Worker('emails', async (job) => {
  const { type, payload } = job.data;
  logger.info(`[EmailQueue] Processing job: ${type} → ${payload.to}`);

  await transporter.sendMail(payload);
  logger.info(`[EmailQueue] Email sent: ${type} → ${payload.to}`);

}, { connection });

emailWorker.on('failed', (job, err) => {
  logger.error(`[EmailQueue] Job ${job.id} (${job.data.type}) failed: ${err.message}`);
});

emailWorker.on('completed', (job) => {
  logger.info(`[EmailQueue] Job ${job.id} (${job.data.type}) completed`);
});

// ─── Helper ───────────────────────────────────────────────────────────────────
const addToEmailQueue = async (type, payload) => {
  await emailQueue.add(type, { type, payload });
};

module.exports = { addToEmailQueue };
