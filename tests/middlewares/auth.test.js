const jwt = require('jsonwebtoken');
const { protect, authorize } = require('../../src/middlewares/auth');
const { User } = require('../../src/models');
const httpMocks = require('node-mocks-http');

jest.mock('jsonwebtoken');
jest.mock('../../src/models', () => ({
  User: { findByPk: jest.fn() }
}));

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('protect', () => {
    it('should return 401 if no authorization header is present', async () => {
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData()).toEqual({ success: false, message: 'Access denied. No token provided.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid format', async () => {
      const req = httpMocks.createRequest({ headers: { authorization: 'InvalidFormatToken123' } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData()).toEqual({ success: false, message: 'Access denied. No token provided.' });
    });

    it('should set req.user and call next on valid token', async () => {
      const req = httpMocks.createRequest({ headers: { authorization: 'Bearer valid_token' } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      jwt.verify.mockReturnValue({ id: 1, tokenVersion: 0 });
      User.findByPk.mockResolvedValue({ id: 1, token_version: 0, status: 'active', role: 'seeker' });

      await protect(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid_token', process.env.JWT_SECRET);
      expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(1);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if user does not exist', async () => {
      const req = httpMocks.createRequest({ headers: { authorization: 'Bearer valid_token' } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      jwt.verify.mockReturnValue({ id: 99, tokenVersion: 0 });
      User.findByPk.mockResolvedValue(null); // User deleted

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toBe('Token is invalid. User not found.');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token version mismatches', async () => {
      const req = httpMocks.createRequest({ headers: { authorization: 'Bearer valid_token' } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      jwt.verify.mockReturnValue({ id: 1, tokenVersion: 0 }); // Old token
      User.findByPk.mockResolvedValue({ id: 1, token_version: 1 }); // User logged out all devices

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toBe('Token has been invalidated. Please login again.');
    });

    it('should handle TokenExpiredError explicitly', async () => {
      const req = httpMocks.createRequest({ headers: { authorization: 'Bearer expired_token' } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => { throw error; });

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toBe('Token has expired. Please login again.');
    });
  });

  describe('authorize', () => {
    it('should call next if user has correct role', () => {
      const req = httpMocks.createRequest({ user: { role: 'admin' } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const middleware = authorize('admin', 'recruiter');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user lacks correct role', () => {
      const req = httpMocks.createRequest({ user: { role: 'seeker' } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res._getJSONData().success).toBe(false);
      expect(res._getJSONData().message).toContain('Access denied');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
