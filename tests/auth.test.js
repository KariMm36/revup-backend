'use strict';

const request = require('supertest');
const app = require('../src/app');

const BASE = '/api/auth';

// ─── Test data ────────────────────────────────────────────────────────────────
const testUser = {
  name: 'Test User',
  email: `test_${Date.now()}@revup.test`,
  password: 'Test@1234!',
  role: 'seeker',
};

let accessToken = '';

// ─── Register ─────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('should register a new user and return a token', async () => {
    const res = await request(app).post(`${BASE}/register`).send(testUser);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    accessToken = res.body.token;
  });

  it('should reject a duplicate email', async () => {
    const res = await request(app).post(`${BASE}/register`).send(testUser);
    expect(res.statusCode).toBe(409);
  });

  it('should reject a weak password', async () => {
    const res = await request(app).post(`${BASE}/register`).send({
      ...testUser,
      email: 'another@test.com',
      password: '12345678', // no uppercase, symbol
    });
    expect(res.statusCode).toBe(422);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('should login and return a token', async () => {
    const res = await request(app).post(`${BASE}/login`).send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    accessToken = res.body.token;
  });

  it('should reject wrong credentials', async () => {
    const res = await request(app).post(`${BASE}/login`).send({
      email: testUser.email,
      password: 'WrongPass@99!',
    });
    expect(res.statusCode).toBe(401);
  });
});

// ─── Get Me ───────────────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('should return the authenticated user', async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe(testUser.email);
  });

  it('should reject requests without a token', async () => {
    const res = await request(app).get(`${BASE}/me`);
    expect(res.statusCode).toBe(401);
  });
});

// ─── Refresh Token ────────────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  it('should reject refresh without a cookie', async () => {
    const res = await request(app).post(`${BASE}/refresh`);
    expect(res.statusCode).toBe(401);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('should logout successfully', async () => {
    const res = await request(app).post(`${BASE}/logout`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
