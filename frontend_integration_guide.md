# RevUp — Frontend Integration Guide

## 1. Base URL & Docs

- **Production Base URL:** `https://<your-railway-domain>.railway.app`
- **Swagger UI:** `GET /api-docs`
- **Raw OpenAPI JSON** (for Postman import): `GET /api-docs.json`

---

## 2. Authentication — How it Works

RevUp uses **JWT (JSON Web Token)** — stateless, no cookies.

### Login Flow
1. Call `POST /api/auth/login` with `{ email, password }`
2. You get back a `token` string
3. Store it (e.g., `localStorage.setItem('token', token)`)
4. Attach it to every protected request as a header:

```http
Authorization: Bearer <token>
```

### Roles
There are **3 roles** embedded inside the JWT payload:
- `seeker` — job hunters
- `recruiter` — employers posting jobs
- `admin` — platform administrators

> **Tip:** Decode the JWT on the frontend (e.g., with `jwt-decode`) to read the role and conditionally show/hide UI elements — no extra API call needed.

---

## 3. All API Endpoints

### 🔑 Auth — `/api/auth`

| Method | Path | Protected | Notes |
|--------|------|-----------|-------|
| POST | `/register` | No | Body: `{ name, email, password, role }`. Role defaults to `seeker` |
| POST | `/login` | No | Returns `{ token, user }` |
| GET | `/me` | Yes | Returns current user info |
| POST | `/forgot-password` | No | Body: `{ email }`. Sends reset link via email |
| PUT | `/reset-password/:token` | No | Token comes from the email link. Body: `{ password }` |
| PUT | `/update-password` | Yes | Body: `{ oldPassword, newPassword }` |

---

### 👤 Users — `/api/users`

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/profile` | Any | Gets full profile + skills |
| PUT | `/profile` | Seeker / Recruiter | Body: `{ name, bio }` |
| PUT | `/skills` | Seeker | Body: `{ skillIds: [1, 3, 5] }` — full replace |
| POST | `/resume` | Seeker | `multipart/form-data`, field name: `resume` |
| POST | `/profile-pic` | Any | `multipart/form-data`, field name: `logo` |
| GET | `/saved-jobs` | Seeker | Returns bookmarked jobs |
| POST | `/save-job/:id` | Seeker | Toggles bookmark (save/unsave) |
| GET | `/search?keyword=` | Recruiter | Search candidate database |
| GET | `/:id` | Recruiter | View a seeker's profile — **privacy guarded** |
| DELETE | `/me` | Any | Deletes own account |

---

### 💼 Jobs — `/api/jobs`

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/` | Public | Supports `?search=`, `?job_type=`, `?location=`, `?page=`, `?limit=` |
| GET | `/latest` | Public | Returns 5 newest open jobs — use on landing page |
| GET | `/recommended` | Seeker | Returns skill-matched jobs with a `match_percentage` field |
| GET | `/my-postings` | Recruiter | All jobs posted by this recruiter |
| POST | `/` | Recruiter | Body: `{ title, description, location, job_type, salary_range, skillIds[] }` |
| GET | `/:id` | Public | Full job details including company info |
| PUT | `/:id` | Recruiter | Edit own job (same body as POST) |
| DELETE | `/:id` | Recruiter | Delete own job |
| PATCH | `/:id/status` | Recruiter | Toggle job between `open` and `closed` |

**`job_type` enum values:** `Full-time`, `Part-time`, `Contract`, `Internship`, `Remote`, `Hybrid`

---

### 🏢 Companies — `/api/companies`

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/` | Public | All companies |
| GET | `/:id` | Public | Company profile + its open jobs |
| POST | `/` | Recruiter | Body (JSON): `{ name, website, description }` |
| PUT | `/` | Recruiter | `multipart/form-data`: `{ name, website, description, logo }` |
| GET | `/my-company` | Recruiter | Get own company profile |
| GET | `/stats` | Recruiter | Total jobs posted, total applications received |

---

### 📝 Applications — `/api/applications`

| Method | Path | Role | Notes |
|--------|------|------|-------|
| POST | `/apply/:jobId` | Seeker | `multipart/form-data`: `{ cover_letter, resume (optional) }` |
| GET | `/my-applications` | Seeker | History of all the seeker's own applications |
| GET | `/job/:jobId` | Recruiter | All applicants for a specific job |
| GET | `/:id` | Recruiter | View one application + seeker profile (privacy enforced) |
| DELETE | `/:id` | Seeker | Withdraw application (only if status is `applied`) |
| PUT | `/:id/status` | Recruiter | Body: `{ status }` — triggers email + in-app notification |

**Application `status` enum:** `applied` → `shortlisted` → `rejected` / `hired`

---

### 🔔 Notifications — `/api/notifications`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | All notifications for current user (unread first) |
| GET | `/unread-count` | Returns `{ count: N }` — use for badge display |
| PATCH | `/:id/read` | Mark one notification as read |
| PATCH | `/read-all` | Mark all as read |
| DELETE | `/:id` | Delete one notification |

> Notifications are created automatically when a recruiter updates an application status. **No WebSockets** — frontend should poll `/unread-count` periodically.

---

### 🎯 Skills — `/api/skills`

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/` | Public | Full skill list — use for autocomplete dropdowns |
| POST | `/` | Admin | Body: `{ name }` |
| PUT | `/:id` | Admin | Body: `{ name }` |
| DELETE | `/:id` | Admin | — |

---

### 🛡️ Admin — `/api/admin`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/users` | All users with `?role=` filter and pagination |
| POST | `/users` | Create user (useful for provisioning admins) |
| GET | `/users/:id` | Single user detail |
| DELETE | `/users/:id` | Delete any user (can't delete another admin) |
| PATCH | `/users/:id/status` | Body: `{ status: "active" \| "suspended" }` |
| GET | `/stats` | Platform-wide counts (users, jobs, applications) |
| GET | `/jobs` | All jobs (open and closed) |
| GET | `/stats/jobs` | Detailed job analytics |
| DELETE | `/jobs/:id` | Force-delete any job |

---

## 4. File Uploads — Important Notes

All file uploads use `multipart/form-data` (NOT `application/json`).

| Upload Type | Endpoint | Field Name | Limit |
|-------------|----------|------------|-------|
| Resume (profile) | `POST /api/users/resume` | `resume` | 5MB, PDF only |
| Resume (on apply) | `POST /api/applications/apply/:jobId` | `resume` | 5MB, PDF only |
| Profile Picture | `POST /api/users/profile-pic` | `logo` | 2MB, images only |
| Company Logo | `PUT /api/companies` | `logo` | 2MB, images only |

Uploaded files are served statically at:
```
GET /uploads/<filename>
```
The response will contain the relative path — prepend the base URL to display images.

---

## 5. Standard Response Format

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "message": "Human-readable error" }
```

**Validation Error (422):**
```json
{ "success": false, "errors": [{ "field": "email", "message": "Invalid email" }] }
```

---

## 6. ⚠️ Key Rules the Frontend Must Respect

1. **Privacy Guard** — A recruiter can only view a seeker's full profile (`GET /api/users/:id`) if that seeker has applied to one of their jobs. Otherwise the API returns `403`. Don't show the "View Profile" button unless the seeker is in the recruiter's applicant list.

2. **Suspended Accounts** — If a user is suspended, login returns `403`. Show a "Your account has been suspended" message instead of the generic error.

3. **Recruiter must create a company first** — Before posting a job, the recruiter needs a company profile. Check `GET /api/companies/my-company` on recruiter login. If `404`, redirect them to create one.

4. **Notification Polling** — There's no real-time WebSocket. Poll `GET /api/notifications/unread-count` every 30–60 seconds to update the notification badge.

5. **Job recommendations require skills** — `GET /api/jobs/recommended` returns ranked results based on seeker skills. If the seeker has no skills set, prompt them to add skills via `PUT /api/users/skills`.

6. **Token expiry** — When any request returns `401 Unauthorized`, clear the stored token and redirect to login.
