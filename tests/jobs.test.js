'use strict';

const request = require('supertest');
const app = require('../src/app');

let recruiterToken = '';
let seekerToken = '';

// ─── Setup — login as recruiter and seeker ────────────────────────────────────
beforeAll(async () => {
  // These users should exist in your test DB (run seeds first)
  const recruiterRes = await request(app).post('/api/auth/login').send({
    email: process.env.TEST_RECRUITER_EMAIL || 'recruiter@revup.test',
    password: process.env.TEST_RECRUITER_PASSWORD || 'Test@1234!',
  });
  recruiterToken = recruiterRes.body.token || '';

  const seekerRes = await request(app).post('/api/auth/login').send({
    email: process.env.TEST_SEEKER_EMAIL || 'seeker@revup.test',
    password: process.env.TEST_SEEKER_PASSWORD || 'Test@1234!',
  });
  seekerToken = seekerRes.body.token || '';
});

// ─── GET /api/jobs ────────────────────────────────────────────────────────────
describe('GET /api/jobs', () => {
  it('should return a list of jobs', async () => {
    const res = await request(app).get('/api/jobs');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── GET /api/jobs/:id ────────────────────────────────────────────────────────
describe('GET /api/jobs/:id', () => {
  it('should return 404 for a non-existent job', async () => {
    const res = await request(app).get('/api/jobs/999999');
    expect(res.statusCode).toBe(404);
  });
});

// ─── POST /api/jobs ───────────────────────────────────────────────────────────
describe('POST /api/jobs', () => {
  it('should reject job creation without auth', async () => {
    const res = await request(app).post('/api/jobs').send({
      title: 'Test Job',
      description: 'A job for testing',
    });
    expect(res.statusCode).toBe(401);
  });

  it('should reject job creation by seeker role', async () => {
    if (!seekerToken) return;
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ title: 'Test Job', description: 'A job for testing' });
    expect(res.statusCode).toBe(403);
  });
});
