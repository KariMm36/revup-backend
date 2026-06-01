'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../models');

/*
  protect — verifies JWT and attaches req.user
*/
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Token is invalid. User not found.' });
    }

    if (decoded.tokenVersion !== user.token_version) {
      return res.status(401).json({ success: false, message: 'Token has been invalidated. Please login again.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

/*
  authorize(...roles) — RBAC guard
  Usage: authorize('admin'), authorize('recruiter', 'admin')
*/
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized for this action.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
