const errorHandler = require('../../src/middlewares/errorHandler');
const httpMocks = require('node-mocks-http');
const logger = require('../../src/config/logger');

jest.mock('../../src/config/logger', () => ({
  error: jest.fn()
}));

describe('ErrorHandler Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle SequelizeUniqueConstraintError', () => {
    const error = new Error('Validation error');
    error.name = 'SequelizeUniqueConstraintError';
    error.errors = [{ path: 'email' }];

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    errorHandler(error, req, res, next);

    expect(logger.error).toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res._getJSONData()).toEqual({ success: false, message: 'email already exists.' });
  });

  it('should handle SequelizeValidationError', () => {
    const error = new Error('Validation error');
    error.name = 'SequelizeValidationError';
    error.errors = [{ path: 'password', message: 'Password is required' }];

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    errorHandler(error, req, res, next);

    expect(res.statusCode).toBe(422);
    expect(res._getJSONData().errors[0].field).toBe('password');
  });

  it('should handle custom App Errors with statusCode', () => {
    const error = new Error('Payment failed');
    error.statusCode = 402;

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    errorHandler(error, req, res, next);

    expect(res.statusCode).toBe(402);
    expect(res._getJSONData().message).toBe('Payment failed');
  });

  it('should fallback to 500 for unknown errors', () => {
    const error = new Error('Database connection lost');

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    errorHandler(error, req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res._getJSONData().message).toBe('Internal server error. Please try again later.');
  });
});
