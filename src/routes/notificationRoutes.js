'use strict';

const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');

/**
 * @openapi
 * tags:
 *   name: Notifications
 *   description: User Notification Alerts
 */

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get user-specific notifications (unread first)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Notifications list }
 */
router.get('/', protect, notificationController.getNotifications);

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Notification marked as read }
 *       404: { description: Not found }
 */
router.patch('/:id/read', protect, notificationController.markAsRead);

/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get count of unread notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Unread count }
 */
router.get('/unread-count', protect, notificationController.getUnreadCount);

/**
 * @openapi
 * /api/notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: All marked as read }
 */
router.patch('/read-all', protect, notificationController.markAllAsRead);

/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Notification deleted }
 */
router.delete('/:id', protect, notificationController.deleteNotification);

module.exports = router;
