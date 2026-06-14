const notificationController = require('../../src/controllers/notificationController');
const { Notification } = require('../../src/models');
const httpMocks = require('node-mocks-http');

jest.mock('../../src/models', () => ({
  Notification: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn()
  }
}));

describe('Notification Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest({ user: { id: 1 } });
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      Notification.create.mockResolvedValue({ id: 1 });
      const result = await notificationController.createNotification({ userId: 1, message: 'Test' });
      expect(result.id).toBe(1);
    });
  });

  describe('getNotifications', () => {
    it('should return all notifications', async () => {
      Notification.findAll.mockResolvedValue([{ id: 1, is_read: false }]);
      await notificationController.getNotifications(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.length).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should update notification to read', async () => {
      req.params.id = 1;
      const mockNotif = { update: jest.fn() };
      Notification.findOne.mockResolvedValue(mockNotif);

      await notificationController.markAsRead(req, res, next);
      expect(mockNotif.update).toHaveBeenCalledWith({ is_read: true });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      Notification.count.mockResolvedValue(5);
      await notificationController.getUnreadCount(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().count).toBe(5);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      await notificationController.markAllAsRead(req, res, next);
      expect(Notification.update).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });
  });

  describe('deleteNotification', () => {
    it('should destroy notification', async () => {
      req.params.id = 1;
      const mockNotif = { destroy: jest.fn() };
      Notification.findOne.mockResolvedValue(mockNotif);

      await notificationController.deleteNotification(req, res, next);
      expect(mockNotif.destroy).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });
  });
});
