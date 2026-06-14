const adminController = require('../../src/controllers/adminController');
const { User, Job, Application, Company } = require('../../src/models');
const httpMocks = require('node-mocks-http');
const bcrypt = require('bcryptjs');

jest.mock('../../src/models', () => ({
  User: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn()
  },
  Job: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn()
  },
  Application: { count: jest.fn() },
  Company: {}
}));
jest.mock('bcryptjs');

describe('Admin Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest({ user: { id: 1, role: 'admin' } });
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return paginated list of users', async () => {
      req.query = { page: 1, limit: 10 };
      User.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ id: 1, name: 'Seeker' }] });

      await adminController.getAllUsers(req, res, next);
      
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.length).toBe(1);
    });
  });

  describe('deleteUser', () => {
    it('should return 403 if trying to delete another admin', async () => {
      req.params.id = 2;
      User.findByPk.mockResolvedValue({ id: 2, role: 'admin' });

      await adminController.deleteUser(req, res, next);
      expect(res.statusCode).toBe(403);
    });

    it('should delete non-admin user', async () => {
      req.params.id = 2;
      const mockUser = { id: 2, role: 'seeker', destroy: jest.fn() };
      User.findByPk.mockResolvedValue(mockUser);

      await adminController.deleteUser(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(mockUser.destroy).toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should return 409 if email exists', async () => {
      req.body = { name: 'Admin', email: 'admin@test.com', password: 'password' };
      User.findOne.mockResolvedValue({ id: 1 });

      await adminController.createUser(req, res, next);
      expect(res.statusCode).toBe(409);
    });

    it('should create user', async () => {
      req.body = { name: 'Admin', email: 'admin@test.com', password: 'password', role: 'admin' };
      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed');
      User.create.mockResolvedValue({ toJSON: () => ({ id: 2, email: 'admin@test.com', password: 'hashed' }) });

      await adminController.createUser(req, res, next);
      expect(res.statusCode).toBe(201);
      expect(User.create).toHaveBeenCalled();
      expect(res._getJSONData().data.password).toBeUndefined(); // ensure password is deleted
    });
  });

  describe('getPlatformStats', () => {
    it('should aggregate stats', async () => {
      User.count.mockResolvedValue(100);
      Job.count.mockResolvedValue(50);
      Application.count.mockResolvedValue(200);

      await adminController.getPlatformStats(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.totalUsers).toBe(100);
    });
  });

  describe('updateUserStatus', () => {
    it('should block suspending an admin', async () => {
      req.params.id = 2;
      req.body = { status: 'suspended' };
      User.findByPk.mockResolvedValue({ id: 2, role: 'admin' });

      await adminController.updateUserStatus(req, res, next);
      expect(res.statusCode).toBe(403);
    });

    it('should update status for seeker', async () => {
      req.params.id = 2;
      req.body = { status: 'suspended' };
      const mockUser = { id: 2, role: 'seeker', update: jest.fn() };
      User.findByPk.mockResolvedValue(mockUser);

      await adminController.updateUserStatus(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(mockUser.update).toHaveBeenCalledWith({ status: 'suspended' });
    });
  });

  describe('deleteJob', () => {
    it('should delete a job', async () => {
      req.params.id = 1;
      const mockJob = { destroy: jest.fn() };
      Job.findByPk.mockResolvedValue(mockJob);

      await adminController.deleteJob(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(mockJob.destroy).toHaveBeenCalled();
    });
  });
});
