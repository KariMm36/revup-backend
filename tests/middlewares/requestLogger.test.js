const requestLogger = require('../../src/middlewares/requestLogger');
const httpMocks = require('node-mocks-http');
const logger = require('../../src/config/logger');

jest.mock('../../src/config/logger', () => ({
  log: jest.fn()
}));

const EventEmitter = require('events').EventEmitter;

describe('RequestLogger Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log HTTP 200 requests with level http', () => {
    const req = httpMocks.createRequest({ method: 'GET', originalUrl: '/api/jobs' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    const next = jest.fn();

    requestLogger(req, res, next);
    
    // Simulate finishing the response
    res.statusCode = 200;
    res.emit('finish');

    expect(next).toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith('http', expect.stringContaining('GET /api/jobs → 200'));
  });

  it('should log HTTP 400 requests with level warn', () => {
    const req = httpMocks.createRequest({ method: 'POST', originalUrl: '/api/login' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    const next = jest.fn();

    requestLogger(req, res, next);
    
    res.statusCode = 401;
    res.emit('finish');

    expect(logger.log).toHaveBeenCalledWith('warn', expect.stringContaining('POST /api/login → 401'));
  });

  it('should log HTTP 500 requests with level error', () => {
    const req = httpMocks.createRequest({ method: 'DELETE', originalUrl: '/api/users/1' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    const next = jest.fn();

    requestLogger(req, res, next);
    
    res.statusCode = 500;
    res.emit('finish');

    expect(logger.log).toHaveBeenCalledWith('error', expect.stringContaining('DELETE /api/users/1 → 500'));
  });
});
