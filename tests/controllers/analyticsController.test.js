const analyticsController = require('../../src/controllers/analyticsController');
const { Company, Job, Application, User } = require('../../src/models');
const httpMocks = require('node-mocks-http');
const sequelize = require('../../src/config/db');

jest.mock('../../src/models', () => ({
  Company: { findOne: jest.fn(), findByPk: jest.fn() },
  Job: { findAll: jest.fn() },
  Application: { findAndCountAll: jest.fn() },
  User: { findByPk: jest.fn() }
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn()
}));

describe('Analytics Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest({ user: { id: 1, role: 'recruiter' } });
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getJobAnalytics', () => {
    it('should return 404 if no company associated', async () => {
      Company.findOne.mockResolvedValue(null);
      User.findByPk.mockResolvedValue(null);

      await analyticsController.getJobAnalytics(req, res, next);
      expect(res.statusCode).toBe(404);
    });

    it('should return job analytics data', async () => {
      Company.findOne.mockResolvedValue({ id: 1 });
      Job.findAll.mockResolvedValue([
        { id: 1, status: 'open', dataValues: { application_count: 5 }, createdAt: new Date() },
        { id: 2, status: 'closed', dataValues: { application_count: 10 }, createdAt: new Date() }
      ]);

      await analyticsController.getJobAnalytics(req, res, next);
      
      expect(res.statusCode).toBe(200);
      const data = res._getJSONData().data;
      expect(data.total_jobs).toBe(2);
      expect(data.open_jobs).toBe(1);
      expect(data.closed_jobs).toBe(1);
      expect(data.jobs.length).toBe(2);
    });
  });

  describe('getApplicationAnalytics', () => {
    it('should return empty data if no jobs exist for company', async () => {
      Company.findOne.mockResolvedValue({ id: 1 });
      Job.findAll.mockResolvedValue([]);

      await analyticsController.getApplicationAnalytics(req, res, next);
      
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.total).toBe(0);
    });

    it('should return combined application stats', async () => {
      Company.findOne.mockResolvedValue({ id: 1 });
      Job.findAll.mockResolvedValue([{ id: 10 }]);
      
      sequelize.query
        .mockResolvedValueOnce([[{ total: 10, applied: 5, shortlisted: 3, rejected: 1, hired: 1 }]]) // statusRows
        .mockResolvedValueOnce([[{ date: '2023-01-01', count: 2 }]]) // timeRows
        .mockResolvedValueOnce([[{ id: 10, title: 'Dev', application_count: 10 }]]); // topJobRows

      await analyticsController.getApplicationAnalytics(req, res, next);
      
      expect(res.statusCode).toBe(200);
      const data = res._getJSONData().data;
      expect(data.total).toBe(10);
      expect(data.by_status.applied).toBe(5);
      expect(data.over_time.length).toBe(1);
      expect(data.top_jobs.length).toBe(1);
    });
  });
});
