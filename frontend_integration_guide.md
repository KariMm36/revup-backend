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

---

## 7. OAuth Login (Google & GitHub)

### New Auth Endpoints

| Method | Path | Protected | Notes |
|--------|------|-----------|-------|
| GET | `/api/auth/google` | No | Opens Google consent screen — use as an `<a href>` or `window.location.href`, NOT fetch |
| GET | `/api/auth/google/callback` | No | Google redirects here — handled by backend |
| GET | `/api/auth/github` | No | Opens GitHub consent screen — same rule as above |
| GET | `/api/auth/github/callback` | No | GitHub redirects here — handled by backend |
| POST | `/api/auth/complete-profile` | Yes (pending JWT) | Called ONCE for new OAuth users to set their role |

---

### OAuth Login Flow (Step by Step)

#### Step 1 — User clicks "Login with Google/GitHub"
```js
// In your login page component:
window.location.href = 'https://your-api.railway.app/api/auth/google';
// or:
window.location.href = 'https://your-api.railway.app/api/auth/github';
```

#### Step 2 — Backend redirects to your `/oauth-callback` page
After the user consents, the backend redirects to:
```
https://your-frontend.com/oauth-callback?token=<JWT>&newUser=true|false
```

#### Step 3 — Your `/oauth-callback` page reads the URL params
```js
// pages/OAuthCallback.jsx (or equivalent)
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const isNewUser = params.get('newUser') === 'true';
const error = params.get('error');

if (error === 'suspended') {
  // Show: "Your account has been suspended."
  return;
}

if (error === 'oauth_failed') {
  // Show: "Login failed. Please try again."
  return;
}

// Always store the token — it's valid even for pending users
localStorage.setItem('token', token);

if (isNewUser) {
  // Redirect to role selection screen
  navigate('/choose-role');
} else {
  // Existing user — go to dashboard
  navigate('/dashboard');
}
```

#### Step 4 — Role selection (new OAuth users only)
On your `/choose-role` page, show two buttons: **"I'm looking for a job"** and **"I'm hiring"**.

When the user picks:
```js
// POST /api/auth/complete-profile
const response = await fetch('/api/auth/complete-profile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  },
  body: JSON.stringify({ role: 'seeker' }), // or 'recruiter'
});

const data = await response.json();
// data.token is a FRESH JWT with the real role — replace the old one!
localStorage.setItem('token', data.token);
navigate('/dashboard');
```

> **Important:** Replace the token after `complete-profile`. The initial token has `role: "pending"` which will be blocked by role guards.

---

### Key Rules for OAuth

1. **Do NOT use fetch/axios** for the `/google` and `/github` initiation URLs — they must be full browser redirects (`window.location.href` or an `<a>` tag).
2. **Always replace the token** after `POST /complete-profile` — the fresh token has the chosen role embedded.
3. **Role guard** — Any route protected by `authorize('seeker')` will reject users with `role: 'pending'`. Always complete the profile step first.
4. **Existing email match** — If a user already has an account with the same email, OAuth will link to that account automatically (no duplicate user).

---

## 8. 🤖 AI Interview System (v2 — Breaking Change)

> **⚠️ If you built against the old `/api/interview/start` + `/api/interview/submit` flow, read this section carefully. Those endpoints no longer work the same way.**

### What Changed at a Glance

| | Old (v1) | New (v2) |
|---|---|---|
| Start request body | `{ track: "Backend" }` | `{ job_id: 34 }` |
| Who can start | Any seeker | Only seekers who **applied** to that job |
| Questions delivery | All at once in start response | One at a time, on demand |
| Answering | `POST /submit` with all answers at once | `POST /:id/answer` per question |
| Grading | Batch, after submit | Immediate, per answer |
| AI cheat detection | End-of-interview report only | Per answer (`ai_probability`) + real-time event tracking |
| Interview complete | Seeker calls submit | Auto-detected by backend (`is_complete: true`) |
| Recruiter notification | On submit | On completion (auto) |

---

### New Interview Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/api/interview/start` | Seeker | Start interview for a job you applied to |
| `GET` | `/api/interview/:id/question` | Seeker | Get next question (fallback) |
| `POST` | `/api/interview/:id/answer` | Seeker | Submit one answer — returns evaluation + next question |
| `POST` | `/api/interview/:id/track` | Seeker | Report a cheat event in real time |
| `GET` | `/api/interview/my-history` | Seeker | Paginated interview list |
| `GET` | `/api/interview/my-history/:id` | Seeker | Full interview detail with answers + report |
| `GET` | `/api/interview/applicant/:seekerId` | Recruiter | View a candidate's interview results |
| `PATCH` | `/api/interview/:id/decision` | Recruiter | Pass or fail the candidate |
| ~~`POST`~~ | ~~`/api/interview/submit`~~ | — | **REMOVED** |

---

### New Interview Flow (Step by Step)

#### Step 1 — Start the interview
```js
// POST /api/interview/start
// Seeker must have applied to job_id first — returns 403 otherwise
const res = await api.post('/api/interview/start', { job_id: 34 });
const { interview_id, job_title, question } = res.data.data;
// `question` is the FIRST question — already loaded, no extra call needed
```

**Response:**
```json
{
  "success": true,
  "data": {
    "interview_id": 12,
    "job_id": 34,
    "job_title": "Senior React Developer",
    "question": {
      "id": 3,
      "question_type": "open",
      "content": "Explain the difference between REST and GraphQL.",
      "options": null,
      "difficulty": "medium"
    }
  }
}
```

---

#### Step 2 — Render the question

- `question_type === "open"` → render a **textarea**
- `question_type === "mcq"` → `question.options` is an array of strings → render **radio buttons**
- Start a timer when the question appears — you must send `time_taken_seconds` with each answer

---

#### Step 3 — Submit the answer
```js
// POST /api/interview/:id/answer
const res = await api.post(`/api/interview/${interview_id}/answer`, {
  question_id: question.id,
  answer: "REST uses fixed endpoints while GraphQL uses a single endpoint...",
  time_taken_seconds: 95,
});
const { evaluation, is_complete, next_question } = res.data.data;
```

**Response (mid-interview, `is_complete: false`):**
```json
{
  "success": true,
  "data": {
    "is_complete": false,
    "evaluation": {
      "score": 0.85,
      "feedback": "Good explanation, but missed mentioning caching.",
      "ai_probability": 0.12
    },
    "next_question": {
      "id": 4,
      "question_type": "mcq",
      "content": "Which hook is used for side effects in React?",
      "options": ["useState", "useEffect", "useCallback", "useMemo"],
      "difficulty": "easy"
    }
  }
}
```

**Response (last answer, `is_complete: true`):**
```json
{
  "success": true,
  "message": "Interview completed! Your results are under review.",
  "data": {
    "is_complete": true,
    "evaluation": { "score": 0.9, "feedback": "Excellent!", "ai_probability": 0.05 },
    "total_score": 78.5,
    "report": { "...": "full AI report" }
  }
}
```

---

#### Step 4 — Loop until done

```js
let currentQuestion = startResponse.question;

while (true) {
  renderQuestion(currentQuestion);
  const { text, duration } = await waitForUserInput();

  const result = await api.post(`/api/interview/${id}/answer`, {
    question_id: currentQuestion.id,
    answer: text,
    time_taken_seconds: duration,
  });

  showFeedback(result.evaluation); // show score + feedback after each answer

  if (result.is_complete) {
    showCompletionScreen(result.total_score);
    break;
  }

  // next_question is returned in the same response — no extra API call needed
  currentQuestion = result.next_question
    ?? (await api.get(`/api/interview/${id}/question`)).data.data; // fallback
}
```

---

#### Step 5 — Report cheat events (optional but recommended)

```js
// Attach event listeners in your interview component
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    api.post(`/api/interview/${id}/track`, {
      event_type: 'tab_switch',
      details: 'User switched tabs',
    }).catch(() => {}); // fire-and-forget, never block the user
  }
});
```

Supported `event_type` values (you define the strings — send whatever is meaningful):
- `"tab_switch"`, `"window_blur"`, `"copy_paste"`, `"right_click"`, `"devtools_open"`, etc.

---

### Recruiter Workflow

```js
// 1. View all interviews for a candidate who applied to your job
const res = await api.get(`/api/interview/applicant/${seekerId}`);
// { seeker: { id, name, email, profile_pic }, interviews: [...] }
// Each interview has: status, total_score, answers[], report

// 2. Make a decision (only when status === "completed")
await api.patch(`/api/interview/${interviewId}/decision`, {
  decision: 'passed',  // or 'failed'
});
// Seeker receives an in-app notification automatically
```

---

### Interview Status State Machine

```
in_progress ──(all answers done)──▶ completed ──(recruiter: passed)──▶ passed
                                              ──(recruiter: failed)──▶ failed
```

> Only show the recruiter decision UI when `interview.status === "completed"`.

---

### Key Rules

1. **Apply first** — `POST /start` returns `403` if the seeker hasn't applied to the job. Disable the "Start Interview" button unless an application exists.
2. **One active per job** — Starting again on the same job returns `400` with the existing `interview_id`. Let seekers resume instead.
3. **Time is required** — `time_taken_seconds` is a required field. Start a timer as soon as the question renders.
4. **Show ai_probability** — Display an "Originality" indicator to both seeker and recruiter: `Math.round((1 - ai_probability) * 100)` = originality %.
5. **`/submit` is gone** — Do not call `POST /api/interview/submit`. It no longer exists.
6. **Old track UI** — Remove any track-selection UI (`Frontend`, `Backend`, etc.). Interviews are now job-specific.
7. **v1 legacy records** — Old interviews will appear in history with `api_version: "v1"` and `track` set. Render them read-only; no actions available.

