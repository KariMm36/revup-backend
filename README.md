# RevUp — Job Portal REST API

A production-level RESTful API connecting **Job Seekers**, **Recruiters**, and **Admins**.

## Tech Stack
- **Runtime:** Node.js + Express.js
- **Database:** MySQL via Sequelize ORM
- **Auth:** JWT with Role-Based Access Control (RBAC)
- **Security:** Helmet, CORS, Bcrypt, Express-Validator
- **Files:** Multer (local storage)
- **Email:** Nodemailer (Gmail SMTP)
- **Docs:** Swagger UI (OpenAPI 3.0)

---

## Quick Start

### 1. Clone and install
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your MySQL credentials and Gmail app password
```

> ⚠️ For Gmail, use an **App Password** (not your regular password).  
> Go to: Google Account → Security → 2-Step Verification → App passwords

### 3. Create MySQL database
```sql
CREATE DATABASE revup_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Start the server
```bash
npm run dev
```

The server will auto-create all tables on first run via `sequelize.sync()`.

---

## API Documentation
Visit `http://localhost:5000/api-docs` for the full interactive Swagger UI.

---

## Endpoints Summary

| Domain | Base Path | Auth |
|---|---|---|
| Auth | `/api/auth` | Mixed |
| Seeker Profile | `/api/users` | Seeker |
| Company | `/api/companies` | Recruiter |
| Jobs | `/api/jobs` | Public/Role |
| Applications | `/api/applications` | Role |
| Skills | `/api/skills` | Public/Admin |
| Admin | `/api/admin` | Admin |
| Notifications | `/api/notifications` | Auth |

---

## Folder Structure
```
src/
├── config/         DB, Multer, Mailer, Swagger
├── models/         Sequelize models + associations
├── middlewares/    Auth (JWT+RBAC), validate, errorHandler
├── validators/     express-validator rule sets
├── services/       emailService (3 HTML templates)
├── controllers/    Business logic (8 controllers)
└── routes/         Express routers (8 files) + Swagger JSDoc
```

---

## Key Features
- ✅ JWT stateless auth with role guards (seeker / recruiter / admin)
- ✅ Skill-matching SQL algorithm for recommended jobs (% overlap)
- ✅ Privacy Rule: recruiter can only view seeker profile if they applied to their job
- ✅ Email triggers: Registration, Status Change, Password Reset
- ✅ Full Swagger UI at `/api-docs`
- ✅ Paginated job listings with search + filters
- ✅ Resume (PDF) and company logo uploads
