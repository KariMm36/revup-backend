const authController = require('../../src/controllers/authController');
const { User, RefreshToken } = require('../../src/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../../src/services/emailService');
const httpMocks = require('node-mocks-http');

jest.mock('../../src/models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn()
  },
  RefreshToken: {
    create: jest.fn()
  }
}));

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../src/services/emailService');
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock_uuid') }));

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return 401 if user not found', async () => {
      req.body = { email: 'non@existent.com', password: 'password123' };
      User.findOne.mockResolvedValue(null);

      await authController.login(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toContain('Invalid email or password');
    });

    it('should return 401 if password does not match', async () => {
      req.body = { email: 'test@test.com', password: 'wrongpassword' };
      User.findOne.mockResolvedValue({ password: 'hashedpassword' });
      bcrypt.compare.mockResolvedValue(false);

      await authController.login(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toContain('Invalid email or password');
    });

    it('should return 403 if account is suspended', async () => {
      req.body = { email: 'test@test.com', password: 'password123' };
      User.findOne.mockResolvedValue({ password: 'hashed', status: 'suspended' });
      bcrypt.compare.mockResolvedValue(true);

      await authController.login(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res._getJSONData().message).toContain('suspended');
    });

    it('should trigger 2FA OTP flow successfully for valid credentials', async () => {
      req.body = { email: 'test@test.com', password: 'password123' };
      const mockUser = { 
        id: 1, 
        email: 'test@test.com', 
        name: 'Test', 
        password: 'hashed', 
        status: 'active',
        update: jest.fn()
      };
      
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashed_otp');
      emailService.sendOtpEmail.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock_otp_token');

      await authController.login(req, res, next);

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({ otp_code: 'hashed_otp' })
      );
      expect(emailService.sendOtpEmail).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().requires_otp).toBe(true);
      expect(res._getJSONData().otp_token).toBe('mock_otp_token');
    });
  });

  describe('verifyOtp', () => {
    it('should return 400 if missing token or code', async () => {
      req.body = { otp_token: 'valid' }; // missing code
      await authController.verifyOtp(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should return 401 if otp token is invalid', async () => {
      req.body = { otp_token: 'invalid', code: '123456' };
      jwt.verify.mockImplementation(() => { throw new Error('invalid') });

      await authController.verifyOtp(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toContain('expired');
    });

    it('should return 401 if wrong purpose', async () => {
      req.body = { otp_token: 'valid', code: '123456' };
      jwt.verify.mockReturnValue({ id: 1, purpose: 'auth' }); // not otp

      await authController.verifyOtp(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toContain('Invalid token');
    });

    it('should return 401 if code is incorrect', async () => {
      req.body = { otp_token: 'valid', code: '000000' };
      jwt.verify.mockReturnValue({ id: 1, purpose: 'otp' });
      const mockUser = { otp_code: 'hashed', otp_expiry: new Date(Date.now() + 10000) };
      User.findByPk.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await authController.verifyOtp(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toContain('Invalid verification code');
    });

    it('should issue JWT and cookie on success', async () => {
      req.body = { otp_token: 'valid', code: '123456' };
      jwt.verify.mockReturnValue({ id: 1, purpose: 'otp' });
      
      const mockUser = { 
        id: 1, name: 'Test', email: 't@t.com', role: 'seeker',
        otp_code: 'hashed', 
        otp_expiry: new Date(Date.now() + 10000),
        update: jest.fn()
      };
      
      User.findByPk.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      
      // Mock generateToken / generateRefreshToken logic
      jwt.sign.mockReturnValue('final_jwt_token');
      RefreshToken.create.mockResolvedValue({ token: 'refresh_token' });

      await authController.verifyOtp(req, res, next);

      expect(mockUser.update).toHaveBeenCalledWith({ otp_code: null, otp_expiry: null });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().token).toBe('final_jwt_token');
      expect(res.cookies.refreshToken.value).toBe('mock_uuid');
    });
  });
});
