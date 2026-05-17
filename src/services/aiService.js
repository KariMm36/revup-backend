'use strict';

const axios = require('axios');
const FormData = require('form-data');

/**
 * Service to interact with the Python AI APIs
 */

// If env var is not set, fallback to the known Railway URL
const AI_BASE_URL = process.env.AI_API_URL || 'https://recommend-for-the-website-production.up.railway.app';

exports.getJobRecommendations = async (profileData) => {
  try {
    const aiUrl = 'https://cvparser-with-recommendation-production.up.railway.app/api/v1/recommend-jobs';
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
    const aiUrl = 'https://cvparser-with-recommendation-production.up.railway.app/api/v1/upload-cv';
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
