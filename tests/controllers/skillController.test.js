const skillController = require('../../src/controllers/skillController');
const { Skill } = require('../../src/models');
const httpMocks = require('node-mocks-http');

jest.mock('../../src/models', () => ({
  Skill: {
    findAll: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn()
  }
}));

describe('Skill Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllSkills', () => {
    it('should return all skills', async () => {
      Skill.findAll.mockResolvedValue([{ id: 1, name: 'React' }]);
      await skillController.getAllSkills(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.length).toBe(1);
    });
  });

  describe('createSkill', () => {
    it('should return 400 if name is missing', async () => {
      req.body = {};
      await skillController.createSkill(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should create a skill', async () => {
      req.body = { name: 'Node.js' };
      Skill.create.mockResolvedValue({ id: 1, name: 'Node.js' });
      await skillController.createSkill(req, res, next);
      expect(res.statusCode).toBe(201);
      expect(Skill.create).toHaveBeenCalled();
    });
  });

  describe('updateSkill', () => {
    it('should return 404 if skill not found', async () => {
      req.params.id = 1;
      req.body = { name: 'Updated' };
      Skill.findByPk.mockResolvedValue(null);
      await skillController.updateSkill(req, res, next);
      expect(res.statusCode).toBe(404);
    });

    it('should update skill', async () => {
      req.params.id = 1;
      req.body = { name: 'Updated' };
      const mockSkill = { update: jest.fn() };
      Skill.findByPk.mockResolvedValue(mockSkill);
      
      await skillController.updateSkill(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(mockSkill.update).toHaveBeenCalledWith({ name: 'Updated' });
    });
  });

  describe('deleteSkill', () => {
    it('should delete a skill', async () => {
      req.params.id = 1;
      const mockSkill = { destroy: jest.fn() };
      Skill.findByPk.mockResolvedValue(mockSkill);
      
      await skillController.deleteSkill(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(mockSkill.destroy).toHaveBeenCalled();
    });
  });
});
