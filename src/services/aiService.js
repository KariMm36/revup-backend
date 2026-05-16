'use strict';

const axios = require('axios');

/**
 * Service to interact with the Python AI APIs
 */

// If env var is not set, fallback to the known Railway URL
const AI_BASE_URL = process.env.AI_API_URL || 'https://recommend-for-the-website-production.up.railway.app';

exports.getJobRecommendations = async (userId, cvText) => {
  try {
    const response = await axios.post(`${AI_BASE_URL}/recommend-jobs`, {
      user_id: userId,
      cv_text: cvText
    });
    
    // The AI returns an array of objects: { job: { ... }, score: 0.8 }
    return response.data;
  } catch (error) {
    console.error('AI Recommendation Service Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch job recommendations from AI service');
  }
};
