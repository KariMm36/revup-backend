require('dotenv').config();
const { User, Company, Job, Application } = require('../src/models');
const sequelize = require('../src/config/db');
const app = require('../src/app');
const request = require('supertest');
const jwt = require('jsonwebtoken');

(async () => {
  try {
    
    // 1. Create a test user
    const user = await User.create({
      name: 'Test Seeker',
      email: `test_seeker_${Date.now()}@test.com`,
      password: 'password123',
      role: 'seeker'
    });
    
    const token = jwt.sign({ id: user.id, role: user.role, tokenVersion: user.token_version }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // 2. Create Company
    const company = await Company.create({
      name: 'Test Company',
      email: `company_${Date.now()}@test.com`
    });
    
    // 3. Create Job with ID 27 (matches AI api revup_id from earlier fetch)
    let job = await Job.findByPk(27);
    if (!job) {
       // Temporarily disable auto-increment or just force insert if sqlite/mysql allows
       try {
         job = await Job.create({
           id: 27,
           company_id: company.id,
           title: 'Test AI Job',
           description: 'Testing the AI flow',
           requirements: 'None',
           type: 'full-time',
           location_type: 'remote'
         });
       } catch (err) {
         console.log('Could not force insert id=27, will use default and let it map to null if no revup_id matches.');
         // We might fail here if the db doesn't let us insert an explicit ID,
         // but MySQL usually does if the ID isn't taken.
       }
    }
    
    if (!job) {
      console.log('Failed to prepare test job with id 27.');
      return;
    }

    // 4. Create Application
    await Application.create({
      job_id: job.id,
      seeker_id: user.id,
      status: 'applied'
    });
    
    console.log('--- Starting Interview ---');
    const startRes = await request(app)
      .post('/api/interview/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ job_id: job.id });
      
    console.log(`Start Status: ${startRes.status}`);
    console.log(`Start Body: ${JSON.stringify(startRes.body, null, 2)}`);
    
    if (startRes.status !== 201) {
       console.log('Interview did not start, stopping test.');
       return;
    }
    
    const interviewId = startRes.body.data.interview_id;
    const questionId = startRes.body.data.question.id;
    
    console.log('\n--- Answering Question ---');
    const answerRes = await request(app)
      .post(`/api/interview/${interviewId}/answer`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        question_id: questionId,
        answer: 'This is an automated test answer to see if the AI evaluates correctly and handles the payload properly.',
        time_taken_seconds: 45
      });
      
    console.log(`Answer Status: ${answerRes.status}`);
    console.log(`Answer Body: ${JSON.stringify(answerRes.body, null, 2)}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
