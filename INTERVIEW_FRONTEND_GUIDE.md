# 🤖 RevUp AI Interview — Frontend Integration Guide

> **Base URL:** `https://revup-backend-production.up.railway.app/api`  
> **Auth:** All endpoints require `Authorization: Bearer <token>` header  
> **Swagger Docs:** `/api-docs`

---

## 📌 Full Flow Overview

```
SEEKER SIDE
───────────
1.  Apply to a job          → POST /applications/apply/:jobId
2.  Start AI interview      → POST /interview/start          { job_id }
3.  Loop until done:
      a. Submit answer       → POST /interview/:id/answer    { question_id, answer, time_taken_seconds }
      b. Read next_question from response  (or GET /interview/:id/question as fallback)
4.  Interview auto-completes on last answer
5.  View your history       → GET  /interview/my-history
6.  View scheduled meetings → GET  /schedule/my-schedule

RECRUITER SIDE
──────────────
1.  View seeker's results   → GET  /interview/applicant/:seekerId
2.  Make decision           → PATCH /interview/:id/decision  { decision: "passed" | "failed" }
3.  Schedule real interview → POST /schedule                 { interview_id, scheduled_at, location, notes }
4.  Update/cancel schedule  → PATCH /schedule/:id  |  DELETE /schedule/:id
```

---

## 🟢 SEEKER — Step by Step

### Step 1 — Start the Interview

```js
// POST /api/interview/start
const res = await api.post('/interview/start', { job_id: 34 });

// ✅ 201 — Success
// res.data.data = {
//   interview_id: 24,       ← save this! you need it for every subsequent call
//   job_id: 34,
//   job_title: "Backend Developer",
//   question: {
//     id: 101,              ← save this as current_question_id
//     question_type: "technical" | "mcq" | "behavioral",
//     content: "Explain the event loop in Node.js.",
//     options: null,        ← array of strings for MCQ, null for open questions
//     difficulty: "medium"
//   }
// }
```

**Error handling:**

| Status | Meaning | What to do |
|--------|---------|------------|
| `400` | Already have an active interview for this job | Resume it using the returned `interview_id` |
| `403` | Haven't applied to this job yet | Redirect to job page to apply first |
| `404` | Job not yet in AI system | Show: *"Interview not yet available for this job"* |
| `502` | AI service down | Show: *"Interview service is currently unavailable. Please try again later."* |

---

### Step 2 — Submit an Answer

> ⚠️ **Critical:** Disable your submit button immediately after the user clicks it. Re-enable only after you get a response. This prevents double-submission.

```js
// POST /api/interview/:id/answer
const res = await api.post(`/interview/${interview_id}/answer`, {
  question_id: 101,        // the id from the current question object
  answer: "The event loop is...",
  time_taken_seconds: 45,  // how long the user took to answer
});

// ✅ 200 — Answer accepted
// res.data.data = {
//   interview_id: 24,
//   is_complete: false,         ← true when last question answered
//   evaluation: {
//     score: 85,                ← score for THIS answer (0–100)
//     feedback: "Good explanation of...",
//     ai_probability: 0.12      ← probability answer was AI-written (0.0–1.0)
//   },
//   next_question: {            ← null when is_complete = true
//     id: 102,
//     question_type: "mcq",
//     content: "Which HTTP method is idempotent?",
//     options: ["GET", "POST", "PUT", "PATCH"],
//     difficulty: "easy"
//   },
//   next_question_unavailable: false   ← see fallback below
// }
```

**After getting the response:**

```js
if (data.is_complete) {
  // 🎉 Interview done — show completion screen
  // data.total_score = overall score (0–100)
  // data.report = full AI report object
  showCompletionScreen(data.total_score, data.report);

} else if (data.next_question) {
  // Move to next question normally
  setCurrentQuestion(data.next_question);
  setSubmitDisabled(false);  // re-enable submit for next question

} else if (data.next_question_unavailable) {
  // AI had a hiccup — use the fallback GET endpoint
  const fallback = await api.get(`/interview/${interview_id}/question`);
  setCurrentQuestion(fallback.data.data);
  setSubmitDisabled(false);
}
```

**Error handling for answer submission:**

| Status | Meaning | What to do |
|--------|---------|------------|
| `409` | **Duplicate submission** — same question_id sent twice | Don't panic. Call `GET /interview/:id/question` and move to next question |
| `400` | Interview is not in progress | Check `interview.status` and show appropriate message |
| `403` | Not your interview | Redirect away |
| `502` | AI grading service down | Show retry option — the answer was NOT recorded |

```js
// ⚠️ Handle 409 Conflict (duplicate submit):
if (error.response?.status === 409) {
  // The first submission already went through — just fetch the next question
  const next = await api.get(`/interview/${interview_id}/question`);
  setCurrentQuestion(next.data.data);
  setSubmitDisabled(false);
  return;
}
```

---

### Step 3 — Fallback: Get Next Question Manually

Use this if `next_question_unavailable` is true, or to refresh:

```js
// GET /api/interview/:id/question
const res = await api.get(`/interview/${interview_id}/question`);

// ✅ 200
// res.data.data = { id, question_type, content, options, difficulty }

// ⚠️ 204 — No more questions (interview may be complete on AI side)
// Call GET /interview/my-history/:id to check status
```

---

### Step 4 — Track Cheating Events (Anti-Cheat)

Call this whenever suspicious behavior is detected (runs silently, never blocks the interview):

```js
// POST /api/interview/:id/track
await api.post(`/interview/${interview_id}/track`, {
  event_type: "tab_switch",   // tab_switch | copy_paste | right_click | window_blur
  details: "User switched tabs for 3 seconds"
});
// Always 200 — fire and forget, don't await this in your UI logic
```

---

### Step 5 — View History

```js
// GET /api/interview/my-history?page=1&limit=10
const res = await api.get('/interview/my-history');

// GET /api/interview/my-history/:id  — full detail with answers & report
const detail = await api.get(`/interview/my-history/${interview_id}`);
```

---

### Step 6 — View Scheduled Real Interviews (Seeker)

After a recruiter passes and schedules a real interview, the seeker can see it:

```js
// GET /api/schedule/my-schedule
const res = await api.get('/schedule/my-schedule');

// res.data.data = [{
//   id: 3,
//   scheduled_at: "2026-06-10T10:00:00.000Z",
//   location: "https://meet.google.com/abc-xyz",
//   notes: "Bring your portfolio",
//   status: "pending" | "confirmed" | "cancelled" | "completed",
//   interview: { id: 24, track: "Backend", total_score: 82 },
//   recruiter: { name: "Sara Ahmed", email: "sara@company.com", profile_pic: "..." }
// }]
```

---

## 🟣 RECRUITER — Step by Step

### Step 1 — View Seeker's AI Interview Results

```js
// GET /api/interview/applicant/:seekerId
const res = await api.get(`/interview/applicant/${seeker_id}`);

// res.data.data = {
//   seeker: { id, name, email, profile_pic },
//   interviews: [
//     {
//       id: 24,
//       job_id: 34,
//       status: "completed",   ← look for "completed" to enable decision
//       total_score: 82.5,
//       answers: [{ question_id, answer, score, feedback, ai_probability, time_taken_seconds }],
//       report: { ... }        ← full AI grading report
//     }
//   ]
// }
```

---

### Step 2 — Make Pass/Fail Decision

> Only works when `interview.status === "completed"`

```js
// PATCH /api/interview/:id/decision
const res = await api.patch(`/interview/${interview_id}/decision`, {
  decision: "passed"   // or "failed"
});

// ✅ 200 — Seeker is automatically notified via in-app notification
// res.data.data = { interview_id, seeker: "John Doe", status: "passed", total_score: 82.5 }
```

**Error handling:**

| Status | Meaning |
|--------|---------|
| `400` | Interview not completed yet — wait for seeker to finish |
| `403` | This job doesn't belong to your company |
| `404` | Interview not found |

---

### Step 3 — Schedule Real Interview (after "passed")

> Only works when `interview.status === "passed"` (after Step 2)

```js
// POST /api/schedule
const res = await api.post('/schedule', {
  interview_id: 24,                        // the AI interview id that was passed
  scheduled_at: "2026-06-10T10:00:00.000Z", // ISO 8601 format, must be future
  location: "https://meet.google.com/abc", // or "Office Room 3"
  notes: "Please bring your portfolio."   // optional
});

// ✅ 201 — Seeker notified via in-app notification + email automatically
```

**Error handling:**

| Status | Meaning |
|--------|---------|
| `400` | Interview not in "passed" status — make decision first |
| `409` | Already scheduled, or time conflict within ±1 hour |

---

### Step 4 — Manage Schedules

```js
// View all your schedules
const res = await api.get('/schedule');

// Update time/location/notes
await api.patch(`/schedule/${schedule_id}`, {
  scheduled_at: "2026-06-11T14:00:00.000Z",
  location: "Zoom: https://zoom.us/j/...",
  notes: "Rescheduled due to conflict.",
  status: "confirmed"   // pending | confirmed | completed
});

// Cancel a schedule
await api.delete(`/schedule/${schedule_id}`, {
  data: { reason: "Position has been filled." }
});
// Seeker gets notified via notification + email automatically
```

---

## 🧠 Key Rules to Remember

### 1. Never double-submit
```js
// ✅ Correct pattern
const handleSubmit = async () => {
  setLoading(true);          // disable button
  try {
    const res = await submitAnswer(...);
    handleResponse(res.data);
  } catch (err) {
    handleError(err);
  } finally {
    setLoading(false);       // re-enable button
  }
};
```

### 2. Always save `interview_id` from start response
```js
// When interview starts:
const { interview_id, question } = res.data.data;
localStorage.setItem('active_interview_id', interview_id);
// This allows resuming if the page refreshes mid-interview
```

### 3. Interview status machine
```
in_progress  →  completed  →  passed  →  [schedule created]
                            →  failed
```

### 4. `ai_probability` display guide
```js
// Show a badge based on ai_probability
const getAIBadge = (prob) => {
  if (prob < 0.3) return { label: "Human-written ✅", color: "green" };
  if (prob < 0.6) return { label: "Possibly AI-assisted ⚠️", color: "yellow" };
  return { label: "Likely AI-generated 🚨", color: "red" };
};
```

---

## 🔁 Complete Interview Loop (Pseudocode)

```js
async function runInterview(job_id) {
  // 1. Start
  const { interview_id, question } = await startInterview(job_id);
  let currentQuestion = question;

  // 2. Loop
  while (currentQuestion) {
    const answer = await getUserAnswer(currentQuestion);  // show question UI, get answer
    const startTime = Date.now();

    setSubmitDisabled(true);

    try {
      const result = await submitAnswer(interview_id, {
        question_id: currentQuestion.id,
        answer: answer,
        time_taken_seconds: Math.floor((Date.now() - startTime) / 1000),
      });

      showEvaluation(result.evaluation);  // show score + feedback for this answer

      if (result.is_complete) {
        showCompletionScreen(result.total_score);
        break;
      }

      if (result.next_question) {
        currentQuestion = result.next_question;
      } else if (result.next_question_unavailable) {
        currentQuestion = await getNextQuestion(interview_id); // fallback
      }

    } catch (err) {
      if (err.response?.status === 409) {
        // duplicate — move to next question
        currentQuestion = await getNextQuestion(interview_id);
      } else {
        showError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitDisabled(false);
    }
  }
}
```

---

*Last updated: 2026-06-05 | Backend version: 4.0.0*
