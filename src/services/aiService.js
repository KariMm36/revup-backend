'use strict';

const axios = require('axios');
const FormData = require('form-data');

/**
 * Service to interact with the Python AI APIs
 */

// If env var is not set, fallback to the known Railway URL
const AI_BASE_URL = process.env.AI_API_URL || 'https://recommend-for-the-website-production.up.railway.app';

exports.getJobRecommendations = async (userId, cvText) => {
  // NOTE: Based on the new AI API, this should be updated to send skills, title, summary
  // We will keep this as a placeholder, but the actual implementation needs to match the new API
  throw new Error('This method needs to be updated to match the new AI recommendation format.');
};

/**
 * Parses a CV by downloading it from the Cloudinary URL and sending it to the AI Service.
 * @param {string} fileUrl - The Cloudinary URL of the uploaded resume
 * @returns {Promise<Object>} The extracted structured profile { skills, title, summary, experience, etc. }
 */
exports.parseCV = async (fileUrl) => {
  try {
    // 1. Download the file stream from Cloudinary
    const fileResponse = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream'
    });

    // 2. Prepare the multipart/form-data payload
    const form = new FormData();
    form.append('file', fileResponse.data, {
      filename: 'resume.pdf', // filename is required for form-data to treat it as a file
      contentType: 'application/pdf',
    });

    // 3. Post to AI API
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
