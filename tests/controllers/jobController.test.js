const jobController = require('../../src/controllers/jobController');
const { Job, Company, Skill, Application, User } = require('../../src/models');
const aiService = require('../../src/services/aiService');
const httpMocks = require('node-mocks-http');

jest.mock('../../src/models', () => ({
  Job: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  Company: { findOne: jest.fn(), findByPk: jest.fn() },
  Skill: {},
  Application: { findAll: jest.fn() },
  User: { findByPk: jest.fn() }
}));

jest.mock('../../src/services/aiService');

describe('Job Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest({ user: { id: 1, role: 'recruiter' } });
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllJobs', () => {
    it('should return paginated list of open jobs', async () => {
      req.query = { page: 1, limit: 10, search: 'Dev' };
      Job.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ id: 1, title: 'Dev' }] });

      await jobController.getAllJobs(req, res, next);
      
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.length).toBe(1);
    });
  });

  describe('getRecommendedJobs', () => {
    it('should return recommended jobs for a seeker', async () => {
      req.user = { id: 2, role: 'seeker' };
      User.findByPk.mockResolvedValue({ skills: [{ name: 'React' }], title: 'Frontend' });
      
      aiService.getJobRecommendations.mockResolvedValue([{ job_id: 1, match_score: 95 }]);
      Job.findAll.mockResolvedValue([{ id: 1, title: 'React Dev' }]);

      await jobController.getRecommendedJobs(req, res, next);
      
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data[0].score).toBe(95);
      expect(res._getJSONData().data[0].job.title).toBe('React Dev');
    });

    it('should return empty if no AI results', async () => {
      req.user = { id: 2, role: 'seeker' };
      User.findByPk.mockResolvedValue({ skills: [] });
      aiService.getJobRecommendations.mockResolvedValue([]);

      await jobController.getRecommendedJobs(req, res, next);
      expect(res._getJSONData().data).toEqual([]);
    });
  });

  describe('createJob', () => {
    it('should return 400 if recruiter has no company', async () => {
      req.body = { title: 'New Job' };
      Company.findOne.mockResolvedValue(null);
      User.findByPk.mockResolvedValue(null);

      await jobController.createJob(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should create job if recruiter has company', async () => {
      req.body = { title: 'New Job', skillIds: [1, 2] };
      Company.findOne.mockResolvedValue({ id: 1 });
      
      const mockJob = { id: 5, setSkills: jest.fn() };
      Job.create.mockResolvedValue(mockJob);
      Job.findByPk.mockResolvedValue({ id: 5, title: 'New Job' });

      await jobController.createJob(req, res, next);
      
      expect(res.statusCode).toBe(201);
      expect(mockJob.setSkills).toHaveBeenCalledWith([1, 2]);
    });
  });

  describe('updateJob', () => {
    it('should return 403 if modifying someone elses job', async () => {
      req.params.id = 1;
      Job.findByPk.mockResolvedValue({ company: { id: 5, recruiter_id: 99 } }); // not user's ID
      
      await jobController.updateJob(req, res, next);
      expect(res.statusCode).toBe(403);
    });

    it('should update job successfully', async () => {
      req.params.id = 1;
      req.body = { title: 'Updated Job' };
      
      const mockJob = { company: { recruiter_id: 1 }, update: jest.fn() };
      Job.findByPk.mockResolvedValue(mockJob);

      await jobController.updateJob(req, res, next);
      expect(mockJob.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated Job' }));
      expect(res.statusCode).toBe(200);
    });
  });

  describe('deleteJob', () => {
    it('should delete job if allowed', async () => {
      req.params.id = 1;
      const mockJob = { company: { recruiter_id: 1 }, destroy: jest.fn() };
      Job.findByPk.mockResolvedValue(mockJob);

      await jobController.deleteJob(req, res, next);
      expect(mockJob.destroy).toHaveBeenCalled();
    });
  });

  describe('toggleJobStatus', () => {
    it('should toggle from open to closed', async () => {
      req.params.id = 1;
      const mockJob = { status: 'open', company: { recruiter_id: 1 }, update: jest.fn() };
      Job.findByPk.mockResolvedValue(mockJob);

      await jobController.toggleJobStatus(req, res, next);
      expect(mockJob.update).toHaveBeenCalledWith({ status: 'closed' });
      expect(res.statusCode).toBe(200);
    });
  });
});
