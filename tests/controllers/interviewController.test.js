const interviewController = require('../../src/controllers/interviewController');
const { Interview, User, Notification, Application, Job, Company } = require('../../src/models');
const aiService = require('../../src/services/aiService');
const httpMocks = require('node-mocks-http');

jest.mock('../../src/models', () => ({
  Interview: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn()
  },
  User: { findByPk: jest.fn(), findAll: jest.fn() },
  Notification: { create: jest.fn(), bulkCreate: jest.fn() },
  Application: { findOne: jest.fn() },
  Job: { findByPk: jest.fn(), findAll: jest.fn() },
  Company: { findOne: jest.fn(), findByPk: jest.fn() }
}));

jest.mock('../../src/services/aiService');

describe('Interview Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest({ user: { id: 1, name: 'Test', email: 't@t.com', role: 'seeker' } });
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('startInterview', () => {
    it('should return 404 if job not found', async () => {
      req.body = { job_id: 1 };
      Job.findByPk.mockResolvedValue(null);

      await interviewController.startInterview(req, res, next);
      expect(res.statusCode).toBe(404);
    });

    it('should return 403 if not applied', async () => {
      req.body = { job_id: 1 };
      Job.findByPk.mockResolvedValue({ id: 1 });
      Application.findOne.mockResolvedValue(null);

      await interviewController.startInterview(req, res, next);
      expect(res.statusCode).toBe(403);
    });

    it('should return 400 if already have active interview', async () => {
      req.body = { job_id: 1 };
      Job.findByPk.mockResolvedValue({ id: 1 });
      Application.findOne.mockResolvedValue({ id: 1 });
      Interview.findOne.mockResolvedValue({ id: 1 });

      await interviewController.startInterview(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should successfully start an interview', async () => {
      req.body = { job_id: 1 };
      Job.findByPk.mockResolvedValue({ id: 1, title: 'Dev' });
      Application.findOne.mockResolvedValue({ id: 1 });
      Interview.findOne.mockResolvedValue(null);
      
      aiService.findAIJobId.mockResolvedValue(10);
      aiService.startAIInterview.mockResolvedValue({ id: 99 });
      aiService.getNextAIQuestion.mockResolvedValue({ id: 1, content: 'Q1' });
      
      Interview.create.mockResolvedValue({ id: 5, status: 'in_progress' });

      await interviewController.startInterview(req, res, next);
      
      expect(res.statusCode).toBe(201);
      expect(res._getJSONData().data.interview_id).toBe(5);
      expect(res._getJSONData().data.question.content).toBe('Q1');
    });
  });

  describe('submitAnswer', () => {
    it('should return 403 if not your interview', async () => {
      req.params.id = 1;
      Interview.findByPk.mockResolvedValue({ seeker_id: 99 });
      
      await interviewController.submitAnswer(req, res, next);
      expect(res.statusCode).toBe(403);
    });

    it('should update answers and fetch next question if not complete', async () => {
      req.params.id = 1;
      req.body = { question_id: 1, answer: 'A', time_taken_seconds: 10 };
      
      const mockInterview = { seeker_id: 1, status: 'in_progress', answers: [], update: jest.fn() };
      Interview.findByPk.mockResolvedValue(mockInterview);
      
      aiService.submitAIAnswer.mockResolvedValue({
        evaluation: { score: 100 },
        is_complete: false
      });
      aiService.getNextAIQuestion.mockResolvedValue({ id: 2, content: 'Q2' });

      await interviewController.submitAnswer(req, res, next);
      
      expect(res.statusCode).toBe(200);
      expect(mockInterview.update).toHaveBeenCalled();
      expect(res._getJSONData().data.next_question.content).toBe('Q2');
    });

    it('should complete interview if is_complete is true', async () => {
      req.params.id = 1;
      req.body = { question_id: 1, answer: 'A', time_taken_seconds: 10 };
      
      const mockInterview = { seeker_id: 1, status: 'in_progress', answers: [], update: jest.fn() };
      Interview.findByPk.mockResolvedValue(mockInterview);
      
      aiService.submitAIAnswer.mockResolvedValue({
        evaluation: { score: 100 },
        is_complete: true
      });
      aiService.getAIReport.mockResolvedValue({ overall_score: 100 });
      Job.findByPk.mockResolvedValue({ company_id: 1 });
      User.findAll.mockResolvedValue([{ id: 2 }]); // recruiter

      await interviewController.submitAnswer(req, res, next);
      
      expect(res.statusCode).toBe(200);
      expect(mockInterview.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
      expect(Notification.bulkCreate).toHaveBeenCalled();
    });
  });

  describe('makeDecision', () => {
    it('should update status to passed and notify seeker', async () => {
      req.user = { id: 2, role: 'recruiter', company_id: 1 };
      req.params.id = 1;
      req.body = { decision: 'passed' };
      
      const mockInterview = { 
        id: 1, 
        job_id: 1, 
        seeker_id: 1, 
        status: 'completed',
        seeker: { name: 'Seeker' },
        update: jest.fn() 
      };
      Interview.findByPk.mockResolvedValue(mockInterview);
      Company.findByPk.mockResolvedValue({ id: 1 });
      Job.findByPk.mockResolvedValue({ company_id: 1 });

      await interviewController.makeDecision(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(mockInterview.update).toHaveBeenCalledWith({ status: 'passed' });
      expect(Notification.create).toHaveBeenCalled();
    });
  });
});
