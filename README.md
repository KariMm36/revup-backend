# RevUp — Job Portal REST API

A production-level RESTful API connecting **Job Seekers**, **Recruiters**, and **Admins** — built for a graduation project.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js + Express.js |
| **Database** | MySQL via Sequelize ORM |
| **Auth** | JWT + Role-Based Access Control (RBAC) |
| **AI Integration** | Groq LLM (via Interview Agent API) |
| **Security** | Helmet, CORS, Bcrypt, Express-Validator |
| **File Uploads** | Multer + Cloudinary |
| **Email** | Nodemailer (Gmail SMTP) |
| **Docs** | Swagger UI (OpenAPI 3.0) |
| **Deployment** | Railway |

---


## Endpoints Overview

| Domain | Base Path | Who Can Access |
|---|---|---|
| Auth | `/api/auth` | Public / Mixed |
| Seeker Profile | `/api/users` | Seeker |
| Company | `/api/companies` | Recruiter |
| Jobs | `/api/jobs` | Public / Role |
| Applications | `/api/applications` | Seeker + Recruiter |
| Skills | `/api/skills` | Public / Admin |
| Notifications | `/api/notifications` | All roles |
| Courses | `/api/courses` | All roles (Admin manages) |
| Analytics | `/api/analytics` | Recruiter / Admin |
| Admin | `/api/admin` | Admin only |
| **AI Interview** | **`/api/interview`** | **Seeker + Recruiter** |
| **Scheduling** | **`/api/schedule`** | **Seeker + Recruiter** |

---

## Project Phases

### ✅ Phase 1 — Core Platform
Auth (JWT + RBAC), User profiles, Company management, Job listings, Applications, Skill-based job matching.

### ✅ Phase 2 — Social & Uploads
Resume & profile picture uploads, Saved jobs, Education / Experience / Certifications, Google & GitHub OAuth.

### ✅ Phase 3 — Courses & Learning
Admin-managed courses and lessons, Seeker enrollment, Lesson progress tracking.

### ✅ Phase 4 — AI Interview Agent
AI-powered mock interview system with full recruiter decision workflow and real interview scheduling.
---

## Key Features

- ✅ JWT stateless auth with role guards (`seeker` / `recruiter` / `admin`)
- ✅ Google & GitHub OAuth login
- ✅ Skill-matching algorithm for AI-powered job recommendations
- ✅ Privacy Rule: recruiter can only view seeker profile if they applied to their job
- ✅ AI mock interview with MCQ + written questions (Groq LLM)
- ✅ AI answer grading + cheating risk detection
- ✅ Recruiter pass/fail decision system with notifications
- ✅ Real interview scheduling with email notifications
- ✅ Email triggers: Welcome, Password Reset, Application Status, Interview Schedule, Cancellation
- ✅ Full Swagger UI at `/api-docs`
- ✅ Paginated job listings with search + filters
- ✅ Resume (PDF) and company logo uploads via Cloudinary
- ✅ Admin analytics dashboard

---

## Folder Structure

```
src/
├── config/          DB, Multer, Cloudinary, Mailer, Swagger, Passport
├── models/          Sequelize models + associations (17 models)
│   ├── User.js
│   ├── Interview.js          ← Phase 4
│   ├── InterviewSchedule.js  ← Phase 4
│   └── ...
├── middlewares/     JWT auth, RBAC, validate, errorHandler
├── validators/      express-validator rule sets
├── services/        emailService (5 HTML email templates)
│   └── aiService.js          ← AI proxy helpers
├── controllers/     Business logic (12 controllers)
│   ├── interviewController.js  ← Phase 4
│   ├── scheduleController.js   ← Phase 4
│   └── ...
└── routes/          Express routers (12 files) + Swagger JSDoc
    ├── interviewRoutes.js  ← Phase 4
    ├── scheduleRoutes.js   ← Phase 4
    └── ...
```

---

## Roles

| Role | Capabilities |
|---|---|
| `seeker` | Apply to jobs, take AI interviews, view schedule, enroll in courses |
| `recruiter` | Post jobs, review applicants, review AI reports, schedule interviews |
| `admin` | Full platform management, analytics, course management |
