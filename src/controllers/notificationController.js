'use strict';

const { Notification } = require('../models');
const { getIo } = require('../config/socket');
const logger = require('../config/logger');

/**
 * Internal helper — create a notification and push it to the user in real-time
 * Usage: createNotification({ userId, message, type })
 */
exports.createNotification = async ({ userId, message, type = 'info' }) => {
  try {
    const notification = await Notification.create({ user_id: userId, message, type });
    const io = getIo();
    if (io) {
      io.to(`user:${userId}`).emit('notification', {
        id: notification.id,
        message,
        type,
        createdAt: notification.createdAt,
      });
    }
    return notification;
  } catch (err) {
    logger.error(`[Notification] Failed to create notification for user ${userId}: ${err.message}`);
  }
};

// GET /api/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [
        ['is_read', 'ASC'],    // Unread first
        ['createdAt', 'DESC'],
      ],
    });
    return res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });

    await notification.update({ is_read: true });
    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });
    return res.status(200).json({ success: true, count });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/notifications/:id
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });

    await notification.destroy();
    return res.status(200).json({ success: true, message: 'Notification deleted.' });
  } catch (err) {
    next(err);
  }
};
