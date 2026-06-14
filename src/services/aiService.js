'use strict';

const axios = require('axios');
const FormData = require('form-data');

// ─── CV Parser / Job Recommender ─────────────────────────────────────────────
// If env var is not set, fallback to the known Railway URL
const AI_BASE_URL = process.env.AI_API_URL || 'https://cvparser-with-recommendation-production.up.railway.app';

exports.getJobRecommendations = async (profileData) => {
  try {
    const aiUrl = `${AI_BASE_URL}/api/v1/recommend-jobs`;
    const response = await axios.post(aiUrl, {
      skills: profileData.skills || [],
      title: profileData.title || '',
      summary: profileData.summary || ''
    });
    
    // The AI returns { success: true, total: 10, recommendations: [...] }
    return response.data.recommendations || [];
  } catch (error) {
    console.error('AI Recommendation Service Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch job recommendations from AI service');
  }
};

/**
 * Parses a CV by sending the file buffer to the AI Service.
 * @param {Buffer} fileBuffer - The binary buffer of the uploaded resume
 * @param {string} originalName - The original file name (e.g., 'resume.pdf')
 * @returns {Promise<Object>} The extracted structured profile { skills, title, summary, experience, etc. }
 */
exports.parseCV = async (fileBuffer, originalName) => {
  try {
    // 1. Prepare the multipart/form-data payload using the memory buffer
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename: originalName,
      contentType: 'application/pdf',
    });

    // 2. Post to AI API
    const aiUrl = `${AI_BASE_URL}/api/v1/upload-cv`;
    const response = await axios.post(aiUrl, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    return response.data;
  } catch (error) {
    console.error('AI CV Parser Error:', error.response?.data || error.message);
    throw new Error('Failed to parse CV with the AI service.');
  }
};

// ─── AI Interview Platform ────────────────────────────────────────────────────
const INTERVIEW_API_BASE = process.env.INTERVIEW_API_URL || 'https://situated-aloof-ambitious.ngrok-free.dev';

const interviewApiClient = axios.create({
  baseURL: INTERVIEW_API_BASE,
  headers: { 'ngrok-skip-browser-warning': '69420' },
  timeout: 30000,
});

// Separate client for report polling — shorter timeout so failed attempts retry faster
const reportApiClient = axios.create({
  baseURL: INTERVIEW_API_BASE,
  headers: { 'ngrok-skip-browser-warning': '69420' },
  timeout: 10000,
});

/**
 * Fetch all jobs from the AI Interview Platform.
 * Each job has { id, revup_id, title, description, skills, seniority }
 * revup_id maps to your local jobs.id
 */
exports.getAIJobs = async () => {
  try {
    const { data } = await interviewApiClient.get('/api/v1/jobs');
    if (!Array.isArray(data)) throw new Error('AI jobs endpoint returned unexpected format');
    return data;
  } catch (err) {
    throw new Error(`AI Interview API unreachable: ${err.message}`);
  }
};

/**
 * Look up the AI-side job_id for a given local job ID.
 * Returns the AI job_id (integer), or null if not found.
 */
exports.findAIJobId = async (localJobId) => {
  const jobs = await exports.getAIJobs();
  // revup_id is an integer in the AI API; localJobId may come in as string — coerce both
  const match = jobs.find((j) => Number(j.revup_id) === Number(localJobId));
  return match ? match.id : null;
};

/**
 * Start a new conversational interview session on the AI platform.
 * @param {number} aiJobId   - The AI API's own job ID (from findAIJobId)
 * @param {string} name      - Candidate full name
 * @param {string} email     - Candidate email
 * @returns {Promise<{ id, job_id, status, candidate_name }>}
 */
exports.startAIInterview = async (aiJobId, name, email) => {
  const { data } = await interviewApiClient.post('/api/v1/interviews/start', {
    job_id: aiJobId,
    candidate_name: name,
    candidate_email: email,
  });
  return data; // InterviewResponse: { id, job_id, status, candidate_name }
};

/**
 * Get the next question for an ongoing interview.
 * If it's an essay question and returns 'Thinking...', we fetch the stream and buffer it.
 * @param {number} aiInterviewId - The AI API's interview ID
 * @returns {Promise<{ id, question_type, content, options, difficulty }>}
 */
exports.getNextAIQuestion = async (aiInterviewId) => {
  const { data } = await interviewApiClient.get(`/api/v1/interviews/${aiInterviewId}/question`);
  
  // If the Python API returns an empty string or "Thinking...", we need to fetch from the stream!
  if (!data.content || data.content.trim() === 'Thinking...') {
    try {
      const streamRes = await interviewApiClient.get(`/api/v1/interviews/${aiInterviewId}/question/${data.id}/stream`, {
        responseType: 'stream'
      });
      
      const chunks = [];
      for await (const chunk of streamRes.data) {
        chunks.push(chunk);
      }
      data.content = Buffer.concat(chunks).toString('utf8').trim();
    } catch (err) {
      console.error('[AI Service] Failed to fetch stream for question:', err.message);
    }
  }

  return data; // QuestionResponse
};

/**
 * Submit an answer to a question and receive immediate evaluation.
 * @param {number} aiInterviewId
 * @param {{ question_id: number, answer: string, time_taken_seconds: number }} payload
 * @returns {Promise<{ status, evaluation: { score, feedback, ai_probability }, is_complete }>}
 */
exports.submitAIAnswer = async (aiInterviewId, payload) => {
  const { data } = await interviewApiClient.post(`/api/v1/interviews/${aiInterviewId}/answer`, payload);
  return data; // AnswerResponse
};

/**
 * Report a cheating event in real-time.
 * @param {number} aiInterviewId
 * @param {{ event_type: string, details: string }} event
 */
exports.trackAICheatEvent = async (aiInterviewId, event) => {
  await interviewApiClient.post(`/api/v1/interviews/${aiInterviewId}/track`, event);
};

/**
 * Fetch the final grading report after the interview is complete.
 * @param {number} aiInterviewId
 * @returns {Promise<Object>} Full report object
 */
exports.getAIReport = async (aiInterviewId) => {
  const { data } = await reportApiClient.get(`/api/v1/interviews/${aiInterviewId}/report`);
  return data;
};

/**
 * Stream a question's text chunk-by-chunk via Server-Sent Events.
 * Pipes the raw SSE stream from the AI API directly to the Express response.
 * @param {number} aiInterviewId - The AI API's interview ID
 * @param {number} questionId    - The question ID to stream
 * @returns {Promise<import('stream').Readable>} A readable stream of text chunks
 */
exports.streamAIQuestion = async (aiInterviewId, questionId) => {
  const response = await interviewApiClient.get(
    `/api/v1/interviews/${aiInterviewId}/question/${questionId}/stream`,
    {
      responseType: 'stream',
      headers: {
        Accept: 'text/plain',
        'ngrok-skip-browser-warning': '69420',
      },
      timeout: 60000, // streaming can take longer
    }
  );
  return response.data; // Readable stream
};
