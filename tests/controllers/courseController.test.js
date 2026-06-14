const courseController = require('../../src/controllers/courseController');
const { Course, Lesson, Enrollment, LessonProgress, User } = require('../../src/models');
const httpMocks = require('node-mocks-http');

jest.mock('../../src/models', () => ({
  Course: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn()
  },
  Lesson: { count: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), max: jest.fn() },
  Enrollment: { count: jest.fn(), findOrCreate: jest.fn(), findAll: jest.fn(), findOne: jest.fn() },
  LessonProgress: { count: jest.fn(), findOrCreate: jest.fn(), findAll: jest.fn() },
  User: {}
}));

describe('Course Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest({ user: { id: 1 } });
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllCourses', () => {
    it('should return published courses', async () => {
      Course.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ id: 1 }] });
      await courseController.getAllCourses(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.length).toBe(1);
    });
  });

  describe('getCourse', () => {
    it('should return course and enrollment count', async () => {
      req.params.id = 1;
      Course.findByPk.mockResolvedValue({ id: 1, status: 'published', toJSON: () => ({ id: 1 }) });
      Enrollment.count.mockResolvedValue(5);

      await courseController.getCourse(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.enrollment_count).toBe(5);
    });
  });

  describe('enrollCourse', () => {
    it('should enroll user if valid', async () => {
      req.params.id = 1;
      Course.findByPk.mockResolvedValue({ id: 1, status: 'published' });
      Enrollment.findOrCreate.mockResolvedValue([{ id: 1 }, true]);

      await courseController.enrollCourse(req, res, next);
      expect(res.statusCode).toBe(201);
    });

    it('should return 409 if already enrolled', async () => {
      req.params.id = 1;
      Course.findByPk.mockResolvedValue({ id: 1, status: 'published' });
      Enrollment.findOrCreate.mockResolvedValue([{ id: 1 }, false]); // false means not created

      await courseController.enrollCourse(req, res, next);
      expect(res.statusCode).toBe(409);
    });
  });

  describe('completeLesson', () => {
    it('should mark lesson complete', async () => {
      req.params = { courseId: 1, lessonId: 1 };
      Enrollment.findOne.mockResolvedValue({ id: 1, update: jest.fn() });
      Lesson.findOne.mockResolvedValue({ id: 1 });
      LessonProgress.findOrCreate.mockResolvedValue([{ completed: false, update: jest.fn() }, false]);
      Lesson.count.mockResolvedValue(1);
      LessonProgress.count.mockResolvedValue(1); // 100%

      await courseController.completeLesson(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.progress_percent).toBe(100);
    });
  });

  describe('createCourse', () => {
    it('should create course', async () => {
      req.body = { title: 'JS 101' };
      Course.create.mockResolvedValue({ id: 1 });

      await courseController.createCourse(req, res, next);
      expect(res.statusCode).toBe(201);
      expect(Course.create).toHaveBeenCalled();
    });
  });

  describe('updateCourse', () => {
    it('should update course', async () => {
      req.params.id = 1;
      const mockCourse = { update: jest.fn() };
      Course.findByPk.mockResolvedValue(mockCourse);

      await courseController.updateCourse(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(mockCourse.update).toHaveBeenCalled();
    });
  });
});
