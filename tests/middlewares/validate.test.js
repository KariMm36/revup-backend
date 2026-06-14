const validate = require('../../src/middlewares/validate');
const httpMocks = require('node-mocks-http');
const { validationResult } = require('express-validator');

jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

describe('Validate Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call next if no validation errors exist', () => {
    validationResult.mockReturnValue({ isEmpty: () => true });

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    validate(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should return 422 if validation errors exist', () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ path: 'email', msg: 'Invalid email' }]
    });

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    validate(req, res, next);

    expect(res.statusCode).toBe(422);
    expect(res._getJSONData().success).toBe(false);
    expect(res._getJSONData().errors[0]).toEqual({ field: 'email', message: 'Invalid email' });
    expect(next).not.toHaveBeenCalled();
  });
});
