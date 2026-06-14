# API Documentation

Base URL: `http://localhost:8000/api/v1`

## 1. Jobs
### `GET /jobs`
Fetches a list of open jobs from the live remote API, caches them, and returns the list.
- **Response**: Array of Job objects.

# API Documentation

Base URL: `http://localhost:8000/api/v1`

## 1. Jobs
### `GET /jobs`
Fetches a list of open jobs from the live remote API, caches them, and returns the list.
- **Response**: Array of Job objects.

## 2. Interviews
### `POST /interviews/start`
Starts a new interview session for a specific job and candidate.
- **Body**: `{"job_id": 24, "candidate_name": "John Doe", "candidate_email": "john@example.com"}`
- **Response**: `{"interview_id": 1, "job_title": "...", "status": "in_progress"}`

### `GET /interviews/{interview_id}/question`
Generates the next dynamic question using AI based on the job requirements and past answers.
- **Path Parameters**:
  - `interview_id` (integer, required)
- **Response**: `{"question_id": 1, "type": "technical", "content": "Explain React hooks...", "difficulty": "medium"}`

### `POST /interviews/{interview_id}/answer`
Submits an answer to the current question, triggering AI evaluation and answer detection.
- **Path Parameters**:
  - `interview_id` (integer, required)
- **Body**: `{"question_id": 1, "answer": "React hooks are...", "time_taken_seconds": 45}`
- **Response**: `{"status": "recorded", "evaluation": {"score": 85, "ai_probability": 10}, "is_complete": false}`

### `POST /interviews/{interview_id}/track`
Logs anti-cheat events triggered from the frontend.
- **Path Parameters**:
  - `interview_id` (integer, required)
- **Body**: `{"event_type": "tab_switch", "timestamp": "...", "details": "Switched for 5s"}`
- **Response**: `{"status": "logged"}`

### `GET /interviews/{interview_id}/report`
Generates the final comprehensive AI report, making a hiring decision and analyzing skill gaps.
- **Path Parameters**:
  - `interview_id` (integer, required)
- **Response**: 
  ```json
  {
    "interview_id": 1,
    "candidate_name": "John Doe",
    "final_score": 82.5,
    "hiring_decision": "HR Interview",
    "ai_probability_avg": 5,
    "suspicion_score": 15,
    "skill_gaps": {
      "missing_skills": ["GraphQL"],
      "weak_areas": ["State Management"],
      "recommended_topics": ["Redux Toolkit"]
    },
    "feedback": "Strong understanding of core React, but needs improvement in modern state management."
  }
  ```

### `GET /interviews/{interview_id}/question/{question_id}/stream`
Streams the raw text of the question chunk-by-chunk using Server-Sent Events (text/plain).
- **Path Parameters**:
  - `interview_id` (integer, required)
  - `question_id` (integer, required)
- **Response**: String chunks directly to the client.

## 3. General
### `GET /`
Health check and welcome endpoint.
- **Response**: `{"message": "Welcome to the AI Interview Platform API"}`
