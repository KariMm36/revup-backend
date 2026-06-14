const companyController = require('../../src/controllers/companyController');
const { Company, Job, Application, User } = require('../../src/models');
const httpMocks = require('node-mocks-http');

jest.mock('../../src/models', () => ({
  Company: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  Job: {
    findAll: jest.fn(),
    count: jest.fn()
  },
  Application: { count: jest.fn() },
  User: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findAll: jest.fn()
  }
}));

describe('Company Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest({ user: { id: 1, role: 'recruiter' } });
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllCompanies', () => {
    it('should return all companies', async () => {
      Company.findAll.mockResolvedValue([{ id: 1, name: 'TechCorp' }]);
      await companyController.getAllCompanies(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.length).toBe(1);
    });
  });

  describe('getCompanyById', () => {
    it('should return company by id', async () => {
      req.params.id = 1;
      Company.findByPk.mockResolvedValue({ id: 1, name: 'TechCorp' });
      await companyController.getCompanyById(req, res, next);
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 if not found', async () => {
      req.params.id = 1;
      Company.findByPk.mockResolvedValue(null);
      await companyController.getCompanyById(req, res, next);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('createCompany', () => {
    it('should return 409 if already owns a company', async () => {
      Company.findOne.mockResolvedValue({ id: 1 });
      await companyController.createCompany(req, res, next);
      expect(res.statusCode).toBe(409);
    });

    it('should create company and assign recruiter', async () => {
      req.body = { name: 'TechCorp' };
      Company.findOne.mockResolvedValue(null);
      Company.create.mockResolvedValue({ id: 5 });
      User.update.mockResolvedValue([1]);

      await companyController.createCompany(req, res, next);
      expect(res.statusCode).toBe(201);
      expect(User.update).toHaveBeenCalledWith({ company_id: 5 }, expect.any(Object));
    });
  });

  describe('updateCompany', () => {
    it('should return 404 if not associated with company', async () => {
      Company.findOne.mockResolvedValue(null);
      User.findByPk.mockResolvedValue(null);
      await companyController.updateCompany(req, res, next);
      expect(res.statusCode).toBe(404);
    });

    it('should update company successfully', async () => {
      req.body = { name: 'UpdatedName' };
      const mockCompany = { id: 1, name: 'Old', update: jest.fn() };
      Company.findOne.mockResolvedValue(mockCompany);

      await companyController.updateCompany(req, res, next);
      expect(mockCompany.update).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });
  });

  describe('getCompanyStats', () => {
    it('should return aggregated stats', async () => {
      Company.findOne.mockResolvedValue({ id: 1 });
      Job.count.mockImplementation(({ where }) => {
        if (where.status) return 5; // open jobs
        return 10; // total jobs
      });
      Job.findAll.mockResolvedValue([{ id: 1 }]);
      Application.count.mockResolvedValue(20);
      User.count.mockResolvedValue(3);

      await companyController.getCompanyStats(req, res, next);
      
      expect(res.statusCode).toBe(200);
      const stats = res._getJSONData().data;
      expect(stats.total_jobs).toBe(10);
      expect(stats.open_jobs).toBe(5);
      expect(stats.closed_jobs).toBe(5);
      expect(stats.total_applications).toBe(20);
      expect(stats.total_recruiters).toBe(3);
    });
  });

  describe('assignRecruiter', () => {
    it('should allow owner to assign recruiter', async () => {
      req.body = { email: 'r@test.com' };
      Company.findOne.mockResolvedValue({ id: 1, name: 'TechCorp', recruiter_id: 1 });
      
      const mockRecruiter = { id: 2, name: 'Recruiter 2', company_id: null, update: jest.fn() };
      User.findOne.mockResolvedValue(mockRecruiter);

      await companyController.assignRecruiter(req, res, next);
      
      expect(mockRecruiter.update).toHaveBeenCalledWith({ company_id: 1 });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('removeRecruiter', () => {
    it('should allow owner to remove assigned recruiter', async () => {
      req.params.recruiterId = 2;
      Company.findOne.mockResolvedValue({ id: 1, recruiter_id: 1 }); // owner is 1
      
      const mockRecruiter = { id: 2, update: jest.fn() };
      User.findOne.mockResolvedValue(mockRecruiter);

      await companyController.removeRecruiter(req, res, next);
      
      expect(mockRecruiter.update).toHaveBeenCalledWith({ company_id: null });
      expect(res.statusCode).toBe(200);
    });

    it('should prevent owner from removing themselves', async () => {
      req.params.recruiterId = 1; // trying to remove self
      Company.findOne.mockResolvedValue({ id: 1, recruiter_id: 1 });

      await companyController.removeRecruiter(req, res, next);
      expect(res.statusCode).toBe(400);
    });
  });
});
