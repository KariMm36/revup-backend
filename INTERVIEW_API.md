# 🤖 RevUp — AI Interview API Guide (Frontend Integration)

> **Base URL (Local):** `http://localhost:5000`
> **Base URL (Production):** `https://revup-backend-production.up.railway.app`
> All requests require `Authorization: Bearer <token>` unless noted.

---

## 📋 Overview

The interview flow works like this:

```
1. Seeker applies to a job
2. Seeker starts an interview  →  gets interview_id + first question
3. Seeker submits answer       →  gets evaluation + next question
4. Repeat until is_complete: true
5. Recruiter reviews report    →  makes pass/fail decision
6. Seeker gets notified
```

---

## 🔐 Auth

All interview endpoints are **seeker-only** except:
- `GET /api/interview/applicant/:seekerId` → recruiter only
- `PATCH /api/interview/:id/decision` → recruiter only

---

## 📌 Endpoints

---

### 1. `POST /api/interview/start`
**Start a new AI interview for a job.**

> Seeker must have already applied to the job before calling this.

#### Request Body
```json
{
  "job_id": 27
}
```

#### Success Response — `201`
```json
{
  "success": true,
  "message": "Interview started for \"Software QA Engineer\". Good luck!",
  "data": {
    "interview_id": 5,
    "job_id": 27,
    "job_title": "Software QA Engineer",
    "question": {
      "id": 12,
      "question_type": "mcq",
      "content": "What does HTTP stand for?",
      "difficulty": "easy",
      "options": ["A) HyperText Transfer Protocol", "B) HighText Transfer Protocol", "C) HyperText Transmission Protocol", "D) All of the above"]
    }
  }
}
```

> `question.options` is **`null`** for non-MCQ questions (open, short_qa, technical, coding, scenario).
> `question.content` is **always a non-empty string** — the backend validates this.

#### Error Responses
| Status | Meaning |
|--------|---------|
| `400` | Already have an active interview for this job → `data.interview_id` tells you which one to resume |
| `403` | Haven't applied to this job |
| `404` | Job not found, or not available in AI system |
| `502` | AI service is down or returned an invalid question |

---

### 2. `POST /api/interview/:id/answer`
**Submit one answer and receive evaluation + next question.**

#### Request Body
```json
{
  "question_id": 12,
  "answer": "A) HyperText Transfer Protocol",
  "time_taken_seconds": 45
}
```

> For MCQ: pass the full option string (e.g. `"A) HyperText Transfer Protocol"`).
> For open/technical: pass the full text answer.

#### Success Response — `200` (Interview still in progress)
```json
{
  "success": true,
  "data": {
    "interview_id": 5,
    "is_complete": false,
    "evaluation": {
      "score": 85,
      "feedback": "Good answer! You correctly identified the protocol.",
      "ai_probability": 0.05
    },
    "next_question": {
      "id": 13,
      "question_type": "short_qa",
      "content": "What is the main purpose of an API test?",
      "difficulty": "medium",
      "options": null
    },
    "next_question_unavailable": false
  }
}
```

#### Success Response — `200` (Interview complete)
```json
{
  "success": true,
  "message": "Interview completed! Your results are under review.",
  "data": {
    "interview_id": 5,
    "is_complete": true,
    "evaluation": {
      "score": 90,
      "feedback": "Excellent final answer!",
      "ai_probability": 0.02
    },
    "total_score": 78.5,
    "report": { ... }
  }
}
```

> ⚠️ When `is_complete: true`, there is **no `next_question` field** in the response.

---

### ⚠️ IMPORTANT: Handling `next_question_unavailable`

The AI platform sometimes fails to return the next question (network issue, or the question content is blank on their side).

In this case:
- `next_question` will be **`null`**
- `next_question_unavailable` will be **`true`**
- `is_complete` will still be **`false`** (interview is NOT done)

**Frontend should handle this like so:**

```js
const { is_complete, next_question, next_question_unavailable } = response.data;

if (is_complete) {
  // ✅ Show completion screen / results
  showCompletionScreen(response.data.total_score, response.data.report);

} else if (next_question) {
  // ✅ Normal case — render the next question
  showQuestion(next_question);

} else if (next_question_unavailable) {
  // ⚠️ AI glitch — show retry button
  // User clicks retry → call GET /api/interview/:id/question
  showRetryButton("Loading next question failed. Please try again.");
}
```

---

### 3. `GET /api/interview/:id/question`
**Fallback: get the current question for an ongoing interview.**

Use this as a retry when `next_question_unavailable: true`.

#### Success Response — `200`
```json
{
  "success": true,
  "data": {
    "id": 13,
    "question_type": "technical",
    "content": "What are best practices for API integration testing?",
    "difficulty": "medium",
    "options": null
  }
}
```

#### Error Responses
| Status | Meaning |
|--------|---------|
| `204` | No question available (AI session may be complete on their side — treat as done) |
| `400` | Interview is not in progress |
| `502` | AI service unreachable |

---

### 4. `POST /api/interview/:id/track`
**Report a cheating event (tab switch, copy-paste, etc.).**

Call this silently in the background — do not block the user.

#### Request Body
```json
{
  "event_type": "tab_switch",
  "details": "User switched to another tab for 3 seconds"
}
```

**Supported `event_type` values:** `tab_switch`, `copy_paste`, `right_click`, `window_blur`, `screen_share`

#### Response — `200`
```json
{ "success": true, "message": "Event recorded." }
```

---

### 5. `GET /api/interview/my-history`
**Get the seeker's own interview list (paginated).**

#### Query Params
| Param | Default | Max |
|-------|---------|-----|
| `page` | `1` | — |
| `limit` | `10` | `50` |

#### Response — `200`
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "job_id": 27,
      "status": "completed",
      "total_score": 78.5,
      "api_version": "v2",
      "createdAt": "2026-06-04T18:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

> ⚠️ `data` is a **flat array** — not `data.interviews`. Access it as `response.data.data`.

---

### 6. `GET /api/interview/my-history/:id`
**Get full detail of one interview (with all answers and AI report).**

#### Response — `200`
```json
{
  "success": true,
  "data": {
    "id": 5,
    "job_id": 27,
    "status": "completed",
    "total_score": 78.5,
    "answers": [
      {
        "question_id": 12,
        "answer": "A) HyperText Transfer Protocol",
        "time_taken_seconds": 45,
        "score": 85,
        "feedback": "Good answer!",
        "ai_probability": 0.05
      }
    ],
    "report": { ... }
  }
}
```

---

### 7. `GET /api/interview/applicant/:seekerId` *(Recruiter only)*
**View all interview results for a seeker who applied to your company's jobs.**

#### Response — `200`
```json
{
  "success": true,
  "data": {
    "seeker": {
      "id": 3,
      "name": "Ahmed Ali",
      "email": "ahmed@gmail.com",
      "profile_pic": "..."
    },
    "interviews": [ ... ]
  }
}
```

---

### 8. `PATCH /api/interview/:id/decision` *(Recruiter only)*
**Make a pass/fail decision on a completed interview.**

#### Request Body
```json
{
  "decision": "passed"
}
```

> Only `"passed"` or `"failed"` are valid. Seeker is automatically notified.

#### Response — `200`
```json
{
  "success": true,
  "message": "Interview marked as passed. Seeker has been notified.",
  "data": {
    "interview_id": 5,
    "seeker": "Ahmed Ali",
    "status": "passed",
    "total_score": 78.5
  }
}
```

---

## 🗂️ Question Types Reference

| `question_type` | `options` | Description |
|----------------|-----------|-------------|
| `mcq` | `string[]` (4 items) | Multiple choice — pass full option string as answer |
| `short_qa` | `null` | Short text answer |
| `technical` | `null` | Technical explanation |
| `scenario` | `null` | Scenario-based question |
| `coding` | `null` | Code implementation question |

---

## 🚦 Interview Status Flow

```
in_progress  →  completed  →  passed
                           →  failed
```

| Status | Meaning |
|--------|---------|
| `in_progress` | Interview is ongoing |
| `completed` | All questions answered, waiting for recruiter decision |
| `passed` | Recruiter approved — seeker moves to scheduling |
| `failed` | Recruiter rejected |

---

## 📊 Evaluation Fields

Returned per-answer after each submission:

| Field | Type | Description |
|-------|------|-------------|
| `score` | `0–100` | Answer quality score |
| `feedback` | `string` | AI feedback on the answer |
| `ai_probability` | `0.0–1.0` | Likelihood answer was AI-generated (0 = human, 1 = AI) |

---

## 🔁 Complete Frontend Flow Example

```js
// 1. Start interview
const startRes = await api.post('/api/interview/start', { job_id: 27 });
const { interview_id, question } = startRes.data.data;
showQuestion(question);

// 2. On answer submit
async function submitAnswer(interviewId, questionId, answer, timeTaken) {
  const res = await api.post(`/api/interview/${interviewId}/answer`, {
    question_id: questionId,
    answer,
    time_taken_seconds: timeTaken,
  });

  const { is_complete, evaluation, next_question, next_question_unavailable } = res.data.data;

  showEvaluation(evaluation); // show score/feedback

  if (is_complete) {
    showCompletionScreen(res.data.data.total_score);
  } else if (next_question) {
    showQuestion(next_question);
  } else if (next_question_unavailable) {
    // Retry fallback
    const retryRes = await api.get(`/api/interview/${interviewId}/question`);
    if (retryRes.status === 200) {
      showQuestion(retryRes.data.data);
    } else {
      showCompletionScreen(); // treat as done
    }
  }
}
```

---

## ⚡ Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /start` | 5 per hour |
| `POST /:id/answer` | 30 per minute |

---

*Last updated: June 2026 — backend v4.0.0*
