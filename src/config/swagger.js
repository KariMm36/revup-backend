'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RevUp Job Portal API',
      version: '3.0.0',
      description: `
## RevUp — AI-Powered Job Portal API `.trim(),
      contact: {
        name: 'RevUp Dev Team',
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://revup-backend-production.up.railway.app'
          : `http://localhost:${process.env.PORT || 5000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token. Obtain it from POST /api/auth/login',
        },
      },
      schemas: {
        // ── Shared success/error wrappers ──────────────────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data:    { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page:  { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
        // ── Domain schemas ────────────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            id:         { type: 'integer', example: 1 },
            name:       { type: 'string',  example: 'Nour Vander' },
            email:      { type: 'string',  example: 'nour@example.com' },
            role:       { type: 'string',  enum: ['seeker', 'recruiter', 'admin'] },
            bio:        { type: 'string',  nullable: true },
            profile_pic:{ type: 'string',  nullable: true },
            resume_url: { type: 'string',  nullable: true },
            is_active:  { type: 'boolean', example: true },
          },
        },
        Job: {
          type: 'object',
          properties: {
            id:           { type: 'integer' },
            title:        { type: 'string' },
            description:  { type: 'string' },
            location:     { type: 'string' },
            job_type:     { type: 'string', enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote', 'Hybrid'] },
            salary_range: { type: 'string', nullable: true },
            status:       { type: 'string', enum: ['open', 'closed'] },
          },
        },
        Application: {
          type: 'object',
          properties: {
            id:           { type: 'integer' },
            job_id:       { type: 'integer' },
            seeker_id:    { type: 'integer' },
            status:       { type: 'string', enum: ['applied', 'shortlisted', 'rejected', 'auto-rejected', 'hired'] },
            stage_id:     { type: 'integer', nullable: true },
            cover_letter: { type: 'string', nullable: true },
            resume_url:   { type: 'string', nullable: true },
          },
        },
        Course: {
          type: 'object',
          properties: {
            id:               { type: 'integer', example: 1 },
            title:            { type: 'string',  example: 'Introduction to Node.js' },
            description:      { type: 'string',  example: 'Learn Node.js from scratch' },
            thumbnail:        { type: 'string',  nullable: true, example: 'https://example.com/thumb.jpg' },
            category:         { type: 'string',  example: 'Backend Development' },
            level:            { type: 'string',  enum: ['beginner', 'intermediate', 'advanced'] },
            status:           { type: 'string',  enum: ['draft', 'published'] },
            admin_id:         { type: 'integer', example: 1 },
          },
        },
        Lesson: {
          type: 'object',
          properties: {
            id:               { type: 'integer', example: 1 },
            course_id:        { type: 'integer', example: 1 },
            title:            { type: 'string',  example: 'What is Node.js?' },
            youtube_url:      { type: 'string',  example: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4' },
            duration_minutes: { type: 'integer', example: 15, nullable: true },
            order:            { type: 'integer', example: 1 },
          },
        },
        UserRoadmap: {
          type: 'object',
          properties: {
            id:            { type: 'integer' },
            seeker_id:     { type: 'integer' },
            failed_job_id: { type: 'integer' },
            progress:      { type: 'number', example: 40 },
            status:        { type: 'string', enum: ['in-progress', 'completed'] },
          },
        },
      },
    },
    // Global security — apply to all endpoints by default
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',         description: '🔑 Authentication & Account Management (public + authenticated)' },
      { name: 'Users',        description: '👤 Seeker Profile, Skills, Resume & Learning Roadmap' },
      { name: 'Companies',    description: '🏢 Recruiter Company Profile Management' },
      { name: 'Jobs',         description: '💼 Job Listings — Browse, Post, and Manage' },
      { name: 'Applications', description: '📄 Application Lifecycle + Kanban Pipeline + Skill Gap Analysis' },
      { name: 'Courses',      description: '🎓 Learning Courses — Browse, Enroll & Track Progress' },
      { name: 'Skills',       description: '🛠️ Global Skill Catalogue (Admin-managed)' },
      { name: 'Notifications',description: '🔔 In-App Notification Centre' },
      { name: 'Admin',        description: '🛡️ Admin Panel — User Moderation & Audit Logs' },
    ],
  },
  // Scan all route files for @openapi JSDoc comments
  apis: [path.join(__dirname, '../routes/*.js')],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
