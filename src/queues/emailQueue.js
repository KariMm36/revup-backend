'use strict';

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const transporter = require('../config/mailer');
const logger = require('../config/logger');

// BullMQ requires Redis — skip gracefully if not configured
if (!process.env.REDIS_URL) {
  logger.warn('[EmailQueue] REDIS_URL not set — email queue is disabled, emails will send inline');
  module.exports = { addToEmailQueue: null };
  return;
}

// Use an ioredis instance — BullMQ requires maxRetriesPerRequest: null
const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('connect', () => logger.info('[EmailQueue] Redis connected'));
connection.on('error', (err) => logger.error(`[EmailQueue] Redis error: ${err.message}`));

// ─── Queue ────────────────────────────────────────────────────────────────────
const emailQueue = new Queue('emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
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
