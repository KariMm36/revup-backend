'use strict';

const { User, Job, Application } = require('../models');

// GET /api/admin/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (role) where.role = role;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot delete an admin account.' });

    await user.destroy();
    return res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/users — Create a new user (especially useful for creating other admins)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(409).json({ success: false, message: 'Email already in use.' });

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'seeker',
    });

    const userWithoutPassword = user.toJSON();
    delete userWithoutPassword.password;

    return res.status(201).json({ success: true, message: 'User created successfully.', data: userWithoutPassword });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/stats
exports.getPlatformStats = async (req, res, next) => {
  try {
    const [totalUsers, totalJobs, totalApplications, openJobs] = await Promise.all([
      User.count(),
      Job.count(),
      Application.count(),
      Job.count({ where: { status: 'open' } }),
    ]);

    const seekers    = await User.count({ where: { role: 'seeker' } });
    const recruiters = await User.count({ where: { role: 'recruiter' } });

    return res.status(200).json({
      success: true,
      data: { totalUsers, seekers, recruiters, totalJobs, openJobs, closedJobs: totalJobs - openJobs, totalApplications },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/jobs — admin gets all jobs (open and closed)
exports.getAllJobs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;

    const { count, rows } = await Job.findAndCountAll({
      where,
      include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'recruiter_id'] }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users/:id — admin views single user
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/status — admin suspends/activates user
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or suspended.' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins cannot suspend other admins.' });
    }

    await user.update({ status });
    return res.status(200).json({ success: true, message: `User status updated to ${status}.`, data: user });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/jobs/:id — admin deletes any job
exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    await job.destroy();
    return res.status(200).json({ success: true, message: 'Job deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/stats/jobs — detailed job analytics
exports.getJobStats = async (req, res, next) => {
  try {
    const { Sequelize } = require('sequelize');
    
    // Group by job type
    const jobsByType = await Job.findAll({
      attributes: ['job_type', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['job_type']
    });

    // Group by status
    const jobsByStatus = await Job.findAll({
      attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['status']
    });

    return res.status(200).json({
      success: true,
      data: {
        byType: jobsByType,
        byStatus: jobsByStatus
      }
    });
  } catch (err) {
    next(err);
  }
};
