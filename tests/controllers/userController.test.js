const userController = require('../../src/controllers/userController');
const { User, Job, Skill, SavedJob, Application, Company, Experience, Education, Certification } = require('../../src/models');
const aiService = require('../../src/services/aiService');
const httpMocks = require('node-mocks-http');

jest.mock('../../src/models', () => ({
  User: {
    findByPk: jest.fn(),
    findAndCountAll: jest.fn()
  },
  Job: { findByPk: jest.fn(), findAll: jest.fn() },
  Skill: { findAll: jest.fn() },
  SavedJob: { count: jest.fn() },
  Application: { findOne: jest.fn(), findAll: jest.fn() },
  Company: { findOne: jest.fn(), findByPk: jest.fn() },
  Experience: { destroy: jest.fn(), bulkCreate: jest.fn() },
  Education: { destroy: jest.fn(), bulkCreate: jest.fn() },
  Certification: { destroy: jest.fn(), bulkCreate: jest.fn() }
}));

jest.mock('../../src/services/aiService');
jest.mock('../../src/config/db', () => ({
  query: jest.fn().mockResolvedValue([[{ total: 10, applied: 5, shortlisted: 2, rejected: 2, hired: 1 }]])
}));

describe('User Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest({ user: { id: 1, role: 'seeker' } });
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      User.findByPk.mockResolvedValue({ id: 1, name: 'Test User' });
      await userController.getProfile(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.name).toBe('Test User');
    });
  });

  describe('updateProfile', () => {
    it('should update and return new profile', async () => {
      req.body = { name: 'New Name' };
      const mockUser = { id: 1, name: 'Old', update: jest.fn() };
      User.findByPk.mockResolvedValue(mockUser);

      await userController.updateProfile(req, res, next);
      expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }));
      expect(res.statusCode).toBe(200);
    });
  });

  describe('toggleSaveJob', () => {
    it('should save a job if not already saved', async () => {
      req.params.id = 1;
      const mockUser = {
        getSavedJobs: jest.fn().mockResolvedValue([]),
        addSavedJob: jest.fn()
      };
      User.findByPk.mockResolvedValue(mockUser);
      Job.findByPk.mockResolvedValue({ id: 1 });

      await userController.toggleSaveJob(req, res, next);
      expect(mockUser.addSavedJob).toHaveBeenCalled();
      expect(res._getJSONData().saved).toBe(true);
    });

    it('should remove a job if already saved', async () => {
      req.params.id = 1;
      const mockUser = {
        getSavedJobs: jest.fn().mockResolvedValue([{ id: 1 }]),
        removeSavedJob: jest.fn()
      };
      User.findByPk.mockResolvedValue(mockUser);
      Job.findByPk.mockResolvedValue({ id: 1 });

      await userController.toggleSaveJob(req, res, next);
      expect(mockUser.removeSavedJob).toHaveBeenCalled();
      expect(res._getJSONData().saved).toBe(false);
    });
  });

  describe('getSeekerStats', () => {
    it('should return stats for seeker dashboard', async () => {
      SavedJob.count.mockResolvedValue(5);
      Application.findAll.mockResolvedValue([]);

      await userController.getSeekerStats(req, res, next);
      
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.total_applications).toBe(10);
      expect(res._getJSONData().data.saved_jobs).toBe(5);
    });
  });

  describe('getSeekerProfile', () => {
    it('should allow recruiter to view if applied', async () => {
      req.user = { id: 2, role: 'recruiter' };
      req.params.id = 1; // seeker id
      
      User.findByPk.mockResolvedValue({ id: 1, role: 'seeker' });
      Company.findOne.mockResolvedValue({ id: 1 });
      Job.findAll.mockResolvedValue([{ id: 10 }]);
      Application.findOne.mockResolvedValue({ id: 1 });

      await userController.getSeekerProfile(req, res, next);
      expect(res.statusCode).toBe(200);
    });

    it('should deny if seeker has not applied to recruiter jobs', async () => {
      req.user = { id: 2, role: 'recruiter' };
      req.params.id = 1; // seeker id
      
      User.findByPk.mockResolvedValue({ id: 1, role: 'seeker' });
      Company.findOne.mockResolvedValue({ id: 1 });
      Job.findAll.mockResolvedValue([{ id: 10 }]);
      Application.findOne.mockResolvedValue(null);

      await userController.getSeekerProfile(req, res, next);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('deleteAccount', () => {
    it('should delete non-admin account', async () => {
      const mockUser = { id: 1, role: 'seeker', destroy: jest.fn() };
      User.findByPk.mockResolvedValue(mockUser);

      await userController.deleteAccount(req, res, next);
      expect(mockUser.destroy).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should block admin account deletion', async () => {
      const mockUser = { id: 1, role: 'admin', destroy: jest.fn() };
      User.findByPk.mockResolvedValue(mockUser);

      await userController.deleteAccount(req, res, next);
      expect(mockUser.destroy).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });
  });
});
