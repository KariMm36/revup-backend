const scheduleController = require('../../src/controllers/scheduleController');
const { InterviewSchedule, Interview, User, Notification } = require('../../src/models');
const { sendInterviewScheduleEmail, sendInterviewCancelledEmail } = require('../../src/services/emailService');
const httpMocks = require('node-mocks-http');

jest.mock('../../src/models', () => ({
  InterviewSchedule: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn()
  },
  Interview: { findByPk: jest.fn() },
  User: {},
  Notification: { create: jest.fn() }
}));

jest.mock('../../src/services/emailService');

describe('Schedule Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest({ user: { id: 1, name: 'Recruiter' } });
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('scheduleInterview', () => {
    it('should return 400 if scheduled in past', async () => {
      req.body = { interview_id: 1, scheduled_at: new Date(Date.now() - 10000) };
      await scheduleController.scheduleInterview(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should create schedule if valid', async () => {
      sendInterviewScheduleEmail.mockResolvedValue();
      req.body = { interview_id: 1, scheduled_at: new Date(Date.now() + 1000000) };
      Interview.findByPk.mockResolvedValue({ id: 1, seeker_id: 1, status: 'passed', track: 'Frontend', seeker: { name: 'Seeker', email: 's@s.com' } });
      InterviewSchedule.findOne.mockResolvedValue(null); // no conflict
      InterviewSchedule.create.mockResolvedValue({ id: 1 });

      await scheduleController.scheduleInterview(req, res, next);
      if (next.mock.calls.length > 0) {
        console.error(next.mock.calls[0][0]);
      }
      expect(res.statusCode).toBe(201);
      expect(Notification.create).toHaveBeenCalled();
      expect(sendInterviewScheduleEmail).toHaveBeenCalled();
    });
  });

  describe('getMySchedule', () => {
    it('should return schedules for seeker', async () => {
      InterviewSchedule.findAll.mockResolvedValue([{ id: 1 }]);
      await scheduleController.getMySchedule(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.length).toBe(1);
    });
  });

  describe('getRecruiterSchedules', () => {
    it('should return schedules for recruiter', async () => {
      InterviewSchedule.findAll.mockResolvedValue([{ id: 1 }]);
      await scheduleController.getRecruiterSchedules(req, res, next);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule properties', async () => {
      req.params.id = 1;
      req.body = { status: 'confirmed' };
      const mockSchedule = { id: 1, recruiter_id: 1, interview: {}, update: jest.fn() };
      InterviewSchedule.findByPk.mockResolvedValue(mockSchedule);

      await scheduleController.updateSchedule(req, res, next);
      expect(mockSchedule.update).toHaveBeenCalledWith({ status: 'confirmed' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('cancelSchedule', () => {
    it('should cancel schedule and notify', async () => {
      sendInterviewCancelledEmail.mockResolvedValue();
      req.params.id = 1;
      const mockSchedule = { 
        id: 1, 
        recruiter_id: 1, 
        interview: { track: 'Frontend' }, 
        seeker: { name: 'Seeker', email: 's@s.com' },
        update: jest.fn() 
      };
      InterviewSchedule.findByPk.mockResolvedValue(mockSchedule);

      await scheduleController.cancelSchedule(req, res, next);
      expect(mockSchedule.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(res.statusCode).toBe(200);
      expect(Notification.create).toHaveBeenCalled();
      expect(sendInterviewCancelledEmail).toHaveBeenCalled();
    });
  });
});
