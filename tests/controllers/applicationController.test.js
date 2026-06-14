const applicationController = require('../../src/controllers/applicationController');
const { Application, Job, Company, User, Notification, Interview } = require('../../src/models');
const { sendApplicationStatusEmail } = require('../../src/services/emailService');
const httpMocks = require('node-mocks-http');

jest.mock('../../src/models', () => ({
  Application: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn()
  },
  Job: { findByPk: jest.fn() },
  Company: { findByPk: jest.fn() },
  User: { findAll: jest.fn() },
  Notification: { bulkCreate: jest.fn(), create: jest.fn() },
  Interview: { findAll: jest.fn() },
  Skill: {}
}));

jest.mock('../../src/services/emailService');

describe('Application Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest({ user: { id: 1, name: 'Seeker', role: 'seeker' } });
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('applyToJob', () => {
    it('should return 404 if job not found', async () => {
      req.params.jobId = 1;
      Job.findByPk.mockResolvedValue(null);

      await applicationController.applyToJob(req, res, next);
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 if past deadline', async () => {
      req.params.jobId = 1;
      Job.findByPk.mockResolvedValue({ status: 'open', application_deadline: new Date('2020-01-01') });

      await applicationController.applyToJob(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().message).toContain('deadline');
    });

    it('should apply to job and notify recruiters', async () => {
      req.params.jobId = 1;
      req.body = { cover_letter: 'Hi' };
      
      Job.findByPk.mockResolvedValue({ 
        status: 'open', 
        company_id: 1, 
        title: 'Dev', 
        company: { name: 'Tech', recruiter_id: 2 } 
      });
      Application.findOne.mockResolvedValue(null);
      Application.create.mockResolvedValue({ id: 5 });
      User.findAll.mockResolvedValue([{ id: 3 }]);
      Company.findByPk.mockResolvedValue({ recruiter_id: 2 });

      await applicationController.applyToJob(req, res, next);
      
      expect(res.statusCode).toBe(201);
      expect(Application.create).toHaveBeenCalled();
      expect(Notification.bulkCreate).toHaveBeenCalled();
    });
  });

  describe('updateApplicationStatus', () => {
    it('should update status and send email', async () => {
      req.user = { id: 2, role: 'recruiter' };
      req.params.id = 1;
      req.body = { status: 'shortlisted' };

      const mockApp = {
        seeker_id: 1,
        job: { title: 'Dev', company: { name: 'Tech', recruiter_id: 2 } },
        seeker: { name: 'Seeker', email: 's@s.com' },
        update: jest.fn()
      };
      Application.findByPk.mockResolvedValue(mockApp);
      sendApplicationStatusEmail.mockResolvedValue();

      await applicationController.updateApplicationStatus(req, res, next);
      
      expect(res.statusCode).toBe(200);
      expect(mockApp.update).toHaveBeenCalledWith({ status: 'shortlisted' });
      expect(Notification.create).toHaveBeenCalled();
      expect(sendApplicationStatusEmail).toHaveBeenCalled();
    });
  });

  describe('withdrawApplication', () => {
    it('should destroy application if allowed', async () => {
      req.params.id = 1;
      const mockApp = {
        seeker_id: 1,
        status: 'applied',
        job: { title: 'Dev', company_id: 1 },
        destroy: jest.fn()
      };
      Application.findByPk.mockResolvedValue(mockApp);
      User.findAll.mockResolvedValue([]);
      Company.findByPk.mockResolvedValue({});

      await applicationController.withdrawApplication(req, res, next);
      
      expect(res.statusCode).toBe(200);
      expect(mockApp.destroy).toHaveBeenCalled();
    });
  });
});
