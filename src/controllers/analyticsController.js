'use strict';

const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/db');
const { Company, Job, Application, User } = require('../models');

// ── Helper: resolve company for recruiter (owner OR assigned) ─────────────────
const getRecruiterCompany = async (userId) => {
  const owned = await Company.findOne({ where: { recruiter_id: userId } });
  if (owned) return owned;
  const user = await User.findByPk(userId, { attributes: ['id', 'company_id'] });
  if (user && user.company_id) return await Company.findByPk(user.company_id);
  return null;
};

// ── Helper: get all job IDs for a company ─────────────────────────────────────
const getCompanyJobIds = async (companyId) => {
  const jobs = await Job.findAll({ where: { company_id: companyId }, attributes: ['id'] });
  return jobs.map((j) => j.id);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/jobs
// Returns per-job breakdown: application count per job, open/closed split
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @openapi
 * /api/analytics/jobs:
 *   get:
 *     tags: [Analytics]
 *     summary: Recruiter job analytics — per-job application counts + open/closed split
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Job analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_jobs: { type: integer }
 *                     open_jobs: { type: integer }
 *                     closed_jobs: { type: integer }
 *                     jobs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           title: { type: string }
 *                           status: { type: string }
 *                           job_type: { type: string }
 *                           location: { type: string }
 *                           application_count: { type: integer }
 *                           createdAt: { type: string, format: date-time }
 *       404: { description: Recruiter not associated with any company }
 */
exports.getJobAnalytics = async (req, res, next) => {
  try {
    const company = await getRecruiterCompany(req.user.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'You are not associated with any company.' });
    }

    // Fetch all jobs with application count in a single query using Sequelize aggregation
    const jobs = await Job.findAll({
      where: { company_id: company.id },
      attributes: [
        'id',
        'title',
        'status',
        'job_type',
        'location',
        'salary_range',
        'createdAt',
        // Subquery count of applications per job
        [
          literal(`(SELECT COUNT(*) FROM applications WHERE applications.job_id = Job.id)`),
          'application_count',
        ],
      ],
      order: [['createdAt', 'DESC']],
    });

    const totalJobs = jobs.length;
    const openJobs = jobs.filter((j) => j.status === 'open').length;
    const closedJobs = totalJobs - openJobs;

    // Shape each job for the response
    const jobList = jobs.map((j) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      job_type: j.job_type,
      location: j.location,
      salary_range: j.salary_range,
      application_count: parseInt(j.dataValues.application_count) || 0,
      createdAt: j.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        total_jobs: totalJobs,
        open_jobs: openJobs,
        closed_jobs: closedJobs,
        jobs: jobList,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/applications
// Returns overall application stats: status breakdown + applications over time
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @openapi
 * /api/analytics/applications:
 *   get:
 *     tags: [Analytics]
 *     summary: Recruiter application analytics — status breakdown + trend over time
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *         description: Number of past days to include in the over_time trend (default 30)
 *     responses:
 *       200:
 *         description: Application analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     by_status:
 *                       type: object
 *                       properties:
 *                         applied: { type: integer }
 *                         shortlisted: { type: integer }
 *                         rejected: { type: integer }
 *                         hired: { type: integer }
 *                     over_time:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date: { type: string }
 *                           count: { type: integer }
 *       404: { description: Recruiter not associated with any company }
 */
exports.getApplicationAnalytics = async (req, res, next) => {
  try {
    const company = await getRecruiterCompany(req.user.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'You are not associated with any company.' });
    }

    const jobIds = await getCompanyJobIds(company.id);

    if (jobIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          by_status: { applied: 0, shortlisted: 0, rejected: 0, hired: 0 },
          over_time: [],
          top_jobs: [],
        },
      });
    }

    // 1. Total + status breakdown in ONE query using conditional aggregation (raw SQL for portability)
    const [statusRows] = await sequelize.query(
      `SELECT
         COUNT(*)                                                 AS total,
         SUM(status = 'applied')                                  AS applied,
         SUM(status = 'shortlisted')                              AS shortlisted,
         SUM(status = 'rejected')                                 AS rejected,
         SUM(status = 'hired')                                    AS hired
       FROM applications
       WHERE job_id IN (:jobIds)`,
      { replacements: { jobIds } }
    );

    const statusData = statusRows[0] || {};

    // 2. Applications over time — grouped by date, last N days (default 30)
    const days = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [timeRows] = await sequelize.query(
      `SELECT
         DATE(createdAt) AS date,
         COUNT(*)        AS count
       FROM applications
       WHERE job_id IN (:jobIds)
         AND createdAt >= :since
       GROUP BY DATE(createdAt)
       ORDER BY DATE(createdAt) ASC`,
      { replacements: { jobIds, since } }
    );

    // 3. Top 5 jobs by application count
    const [topJobRows] = await sequelize.query(
      `SELECT
         j.id,
         j.title,
         j.status,
         COUNT(a.id) AS application_count
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.company_id = :companyId
       GROUP BY j.id, j.title, j.status
       ORDER BY application_count DESC
       LIMIT 5`,
      { replacements: { companyId: company.id } }
    );

    return res.status(200).json({
      success: true,
      data: {
        total: parseInt(statusData.total) || 0,
        by_status: {
          applied:     parseInt(statusData.applied)     || 0,
          shortlisted: parseInt(statusData.shortlisted) || 0,
          rejected:    parseInt(statusData.rejected)    || 0,
          hired:       parseInt(statusData.hired)       || 0,
        },
        over_time: timeRows.map((r) => ({
          date: r.date,
          count: parseInt(r.count),
        })),
        top_jobs: topJobRows.map((r) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          application_count: parseInt(r.application_count),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};
