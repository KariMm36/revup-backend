'use strict';

const axios = require('axios');
const FormData = require('form-data');

/**
 * Service to interact with the Python AI APIs
 *
 * Performance notes:
 *  - All axios calls have explicit timeouts to prevent infinite hangs
 *    (Railway free tier can cold-start and stall indefinitely without one).
 *  - Job recommendations are cached in memory for 10 minutes per unique
 *    profile payload so repeated calls don't re-trigger Railway cold starts.
 */

// If env var is not set, fallback to the known Railway URL
const AI_BASE_URL = process.env.AI_API_URL || 'https://recommend-for-the-website-production.up.railway.app';

// ── In-memory recommendation cache ───────────────────────────────────────────
// Key: JSON-serialised profileData  Value: { data, expiresAt }
const _recommendCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── Timeouts (ms) ────────────────────────────────────────────────────────────
const TIMEOUT_RECOMMEND = 15_000; // 15 s — lightweight text request
const TIMEOUT_PARSE_CV  = 30_000; // 30 s — file upload + NLP parsing

// ─────────────────────────────────────────────────────────────────────────────
// getJobRecommendations
// ─────────────────────────────────────────────────────────────────────────────
exports.getJobRecommendations = async (profileData) => {
  const cacheKey = JSON.stringify(profileData);

  // Return cached result if still fresh
  const cached = _recommendCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    console.log('[aiService] Returning cached job recommendations');
    return cached.data;
  }

  try {
    const aiUrl = 'https://cvparser-with-recommendation-production.up.railway.app/api/v1/recommend-jobs';
    const response = await axios.post(
      aiUrl,
      {
        skills:  profileData.skills  || [],
        title:   profileData.title   || '',
        summary: profileData.summary || '',
      },
      { timeout: TIMEOUT_RECOMMEND }
    );

    // The AI returns { success: true, total: 10, recommendations: [...] }
    const recommendations = response.data.recommendations || [];

    // Store in cache
    _recommendCache.set(cacheKey, {
      data:      recommendations,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return recommendations;
  } catch (error) {
    console.error('AI Recommendation Service Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch job recommendations from AI service');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// parseCV
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Parses a CV by sending the file buffer to the AI Service.
 * @param {Buffer} fileBuffer  - The binary buffer of the uploaded resume
 * @param {string} originalName - The original file name (e.g., 'resume.pdf')
 * @returns {Promise<Object>} The extracted structured profile { skills, title, summary, experience, etc. }
 */
exports.parseCV = async (fileBuffer, originalName) => {
  try {
    // 1. Prepare the multipart/form-data payload using the memory buffer
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename:    originalName,
      contentType: 'application/pdf',
    });

    // 2. Post to AI API with an explicit timeout so we never hang forever
    const aiUrl = 'https://cvparser-with-recommendation-production.up.railway.app/api/v1/upload-cv';
    const response = await axios.post(aiUrl, form, {
      headers: { ...form.getHeaders() },
      timeout: TIMEOUT_PARSE_CV,
    });

    return response.data;
  } catch (error) {
    console.error('AI CV Parser Error:', error.response?.data || error.message);
    throw new Error('Failed to parse CV with the AI service.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// warmUp  — fire-and-forget pings to pre-wake Railway containers
// Call this once at server startup (see server.js / index.js)
// ─────────────────────────────────────────────────────────────────────────────
exports.warmUp = () => {
  const urls = [
    'https://cvparser-with-recommendation-production.up.railway.app',
    'https://interview-production-ee82.up.railway.app',
  ];
  console.log('[aiService] Warming up Railway AI containers...');
  urls.forEach((url) =>
    axios.get(url, { timeout: 10_000 }).catch(() => {
      // Silence errors — warm-up is best-effort
    })
  );
};
