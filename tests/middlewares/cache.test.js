const { cache, invalidateCache } = require('../../src/middlewares/cache');
const httpMocks = require('node-mocks-http');
const logger = require('../../src/config/logger');

// Mock Redis directly via config path
jest.mock('../../src/config/redis', () => ({
  get: jest.fn(),
  setex: jest.fn(),
  keys: jest.fn(),
  del: jest.fn()
}));
const redis = require('../../src/config/redis');

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Cache Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cache()', () => {
    it('should return cached data if available', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ success: true, data: 'cached' }));

      const req = httpMocks.createRequest({ originalUrl: '/api/test' });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const middleware = cache(60);
      await middleware(req, res, next);

      expect(redis.get).toHaveBeenCalledWith('cache:/api/test');
      expect(res._getJSONData()).toEqual({ success: true, data: 'cached' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next and set cache if not available', async () => {
      redis.get.mockResolvedValue(null);
      redis.setex.mockResolvedValue('OK');

      const req = httpMocks.createRequest({ originalUrl: '/api/test' });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const middleware = cache(60);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();

      // Simulate the controller returning JSON
      await res.json({ success: true, data: 'fresh' });

      expect(redis.setex).toHaveBeenCalledWith('cache:/api/test', 60, JSON.stringify({ success: true, data: 'fresh' }));
    });

    it('should fall through to next if Redis throws an error', async () => {
      redis.get.mockRejectedValue(new Error('Redis connection error'));

      const req = httpMocks.createRequest({ originalUrl: '/api/test' });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const middleware = cache(60);
      await middleware(req, res, next);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('falling through'));
      expect(next).toHaveBeenCalled();
    });
  });

  describe('invalidateCache()', () => {
    it('should delete matching keys', async () => {
      redis.keys.mockResolvedValue(['cache:/api/jobs/1', 'cache:/api/jobs/2']);
      redis.del.mockResolvedValue(2);

      await invalidateCache('/api/jobs*');

      expect(redis.keys).toHaveBeenCalledWith('cache:/api/jobs*');
      expect(redis.del).toHaveBeenCalledWith('cache:/api/jobs/1', 'cache:/api/jobs/2');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Invalidated 2 key(s)'));
    });

    it('should do nothing if no keys match', async () => {
      redis.keys.mockResolvedValue([]);

      await invalidateCache('/api/jobs*');

      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
