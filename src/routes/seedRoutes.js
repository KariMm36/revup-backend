'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, Company, Job, Skill, Application, Notification } = require('../models');

/**
 * POST /api/seed
 * Protected by a secret key header — only you can trigger this.
 * Call it ONCE to populate the production database.
 * After seeding, you can remove this route from app.js.
 */
router.post('/', async (req, res) => {
  // ── Secret Key Guard ────────────────────────────────────────────────────────
  const secret = req.headers['x-seed-secret'];
  if (!secret || secret !== process.env.SEED_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Invalid seed secret.' });
  }

  try {
    const log = [];

    // ── 1. SKILLS ─────────────────────────────────────────────────────────────
    const skillData = [
      'JavaScript', 'TypeScript', 'React.js', 'Next.js', 'Vue.js',
      'Node.js', 'Express.js', 'Python', 'Django', 'FastAPI',
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker',
      'AWS', 'Git', 'REST API', 'GraphQL', 'Tailwind CSS',
      'Flutter', 'React Native', 'Java', 'Spring Boot', 'C#',
      'Figma', 'UI/UX Design', 'Agile/Scrum', 'DevOps', 'Kubernetes',
    ];
    await Skill.bulkCreate(skillData.map((name) => ({ name })), { ignoreDuplicates: true });
    const allSkills = await Skill.findAll();
    const skillMap = Object.fromEntries(allSkills.map((s) => [s.name, s.id]));
    log.push(`✅ ${allSkills.length} skills seeded`);

    // ── 2. USERS ──────────────────────────────────────────────────────────────
    const hash = (pw) => bcrypt.hashSync(pw, 10);
    const usersData = [
      { name: 'Admin RevUp',   email: 'admin@revup.com',       password: hash('Admin@1234'),     role: 'admin',     bio: 'Platform administrator.' },
      { name: 'Sara Hassan',   email: 'sara@techcorp.com',     password: hash('Recruiter@1234'), role: 'recruiter', bio: 'HR Manager at TechCorp.' },
      { name: 'Omar Khalil',   email: 'omar@innovatex.com',    password: hash('Recruiter@1234'), role: 'recruiter', bio: 'Talent Acquisition Lead at InnovateX.' },
      { name: 'Ahmed Ali',     email: 'ahmed@gmail.com',       password: hash('Seeker@1234'),    role: 'seeker',    bio: 'Full-stack developer with 3 years of experience.' },
      { name: 'Nour Youssef',  email: 'nour@gmail.com',        password: hash('Seeker@1234'),    role: 'seeker',    bio: 'Frontend developer specializing in React.js.' },
      { name: 'Kareem Samir',  email: 'kareem@gmail.com',      password: hash('Seeker@1234'),    role: 'seeker',    bio: 'Backend engineer focused on Python and Django.' },
      { name: 'Lina Mostafa',  email: 'lina@gmail.com',        password: hash('Seeker@1234'),    role: 'seeker',    bio: 'Mobile developer with expertise in Flutter.' },
    ];
    await User.bulkCreate(usersData, { ignoreDuplicates: true });
    const allUsers = await User.findAll();
    const userMap = Object.fromEntries(allUsers.map((u) => [u.email, u]));
    log.push(`✅ ${allUsers.length} users seeded`);

    // ── 3. USER SKILLS ────────────────────────────────────────────────────────
    const seekerSkillMap = {
      'ahmed@gmail.com':  ['JavaScript', 'Node.js', 'React.js', 'MySQL', 'REST API', 'Git', 'Docker'],
      'nour@gmail.com':   ['React.js', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Figma', 'Git'],
      'kareem@gmail.com': ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Docker', 'AWS', 'Git'],
      'lina@gmail.com':   ['Flutter', 'React Native', 'JavaScript', 'Git', 'Figma'],
    };
    for (const [email, skills] of Object.entries(seekerSkillMap)) {
      const user = userMap[email];
      if (user) {
        const ids = skills.map((s) => skillMap[s]).filter(Boolean);
        await user.setSkills(ids);
      }
    }
    log.push('✅ User skills assigned');

    // ── 4. COMPANIES ──────────────────────────────────────────────────────────
    const [techCorp] = await Company.findOrCreate({
      where: { recruiter_id: userMap['sara@techcorp.com'].id },
      defaults: { name: 'TechCorp Solutions', website: 'https://techcorp.com', description: 'Leading software consultancy across MENA.', recruiter_id: userMap['sara@techcorp.com'].id },
    });
    const [innovateX] = await Company.findOrCreate({
      where: { recruiter_id: userMap['omar@innovatex.com'].id },
      defaults: { name: 'InnovateX Labs', website: 'https://innovatex.io', description: 'Product startup building next-gen SaaS tools.', recruiter_id: userMap['omar@innovatex.com'].id },
    });
    log.push('✅ 2 companies seeded');

    // ── 5. JOBS ───────────────────────────────────────────────────────────────
    const jobsData = [
      { title: 'Senior Full-Stack Developer',    location: 'Cairo, Egypt',      job_type: 'Full-time', salary_range: '$2,500–$4,000/mo', status: 'open',   company_id: techCorp.id,  skills: ['JavaScript','Node.js','React.js','MySQL','REST API','Docker','Git'] },
      { title: 'Frontend Engineer (React.js)',   location: 'Remote',            job_type: 'Remote',    salary_range: '$1,800–$3,000/mo', status: 'open',   company_id: techCorp.id,  skills: ['React.js','TypeScript','Next.js','Tailwind CSS','Git'] },
      { title: 'DevOps / Cloud Engineer',        location: 'Cairo, Egypt',      job_type: 'Full-time', salary_range: '$3,000–$5,000/mo', status: 'open',   company_id: techCorp.id,  skills: ['AWS','Docker','Kubernetes','DevOps','Git'] },
      { title: 'Junior Backend Developer',       location: 'Alexandria, Egypt', job_type: 'Full-time', salary_range: '$800–$1,500/mo',   status: 'open',   company_id: techCorp.id,  skills: ['JavaScript','Node.js','Express.js','MySQL','REST API'] },
      { title: 'UI/UX Designer',                 location: 'Remote',            job_type: 'Part-time', salary_range: '$1,200–$2,000/mo', status: 'closed', company_id: techCorp.id,  skills: ['Figma','UI/UX Design','Tailwind CSS'] },
      { title: 'Python Backend Engineer',        location: 'Remote',            job_type: 'Remote',    salary_range: '$2,000–$3,500/mo', status: 'open',   company_id: innovateX.id, skills: ['Python','Django','FastAPI','PostgreSQL','Docker','AWS'] },
      { title: 'Mobile Developer (Flutter)',     location: 'Cairo, Egypt',      job_type: 'Full-time', salary_range: '$1,500–$2,500/mo', status: 'open',   company_id: innovateX.id, skills: ['Flutter','React Native','JavaScript','REST API','Git'] },
      { title: 'Data Engineer / Database Admin', location: 'Hybrid',            job_type: 'Hybrid',    salary_range: '$2,000–$3,000/mo', status: 'open',   company_id: innovateX.id, skills: ['PostgreSQL','MySQL','MongoDB','Redis','Python'] },
    ];
    const createdJobs = [];
    for (const { skills: jobSkills, ...jobInfo } of jobsData) {
      const description = `We are hiring for the ${jobInfo.title} position.`;
      const [job] = await Job.findOrCreate({ where: { title: jobInfo.title, company_id: jobInfo.company_id }, defaults: { ...jobInfo, description } });
      const ids = jobSkills.map((s) => skillMap[s]).filter(Boolean);
      await job.setSkills(ids);
      createdJobs.push(job);
    }
    log.push(`✅ ${createdJobs.length} jobs seeded`);

    // ── 6. APPLICATIONS ───────────────────────────────────────────────────────
    const appData = [
      { job_id: createdJobs[0].id, seeker_id: userMap['ahmed@gmail.com'].id,  status: 'shortlisted', cover_letter: 'Passionate full-stack developer with 3 years of experience.' },
      { job_id: createdJobs[1].id, seeker_id: userMap['ahmed@gmail.com'].id,  status: 'applied',     cover_letter: 'I love building clean and responsive UIs.' },
      { job_id: createdJobs[1].id, seeker_id: userMap['nour@gmail.com'].id,   status: 'hired',       cover_letter: 'Frontend is my passion. 2 years of React.js experience.' },
      { job_id: createdJobs[5].id, seeker_id: userMap['kareem@gmail.com'].id, status: 'shortlisted', cover_letter: 'Python is my primary language. Production-grade Django APIs.' },
      { job_id: createdJobs[7].id, seeker_id: userMap['kareem@gmail.com'].id, status: 'applied',     cover_letter: 'Extensive PostgreSQL and Redis experience.' },
      { job_id: createdJobs[6].id, seeker_id: userMap['lina@gmail.com'].id,   status: 'rejected',    cover_letter: 'Flutter specialist. 3 apps on App Store and Google Play.' },
      { job_id: createdJobs[3].id, seeker_id: userMap['ahmed@gmail.com'].id,  status: 'applied',     cover_letter: 'Looking for a new backend challenge.' },
    ];
    for (const app of appData) {
      await Application.findOrCreate({ where: { job_id: app.job_id, seeker_id: app.seeker_id }, defaults: app });
    }
    log.push(`✅ ${appData.length} applications seeded`);

    // ── 7. NOTIFICATIONS ──────────────────────────────────────────────────────
    const notifData = [
      { user_id: userMap['ahmed@gmail.com'].id,  message: 'Your application for "Senior Full-Stack Developer" has been updated to: SHORTLISTED.', is_read: false },
      { user_id: userMap['nour@gmail.com'].id,   message: 'Your application for "Frontend Engineer" has been updated to: HIRED. Congratulations! 🎉', is_read: false },
      { user_id: userMap['kareem@gmail.com'].id, message: 'Your application for "Python Backend Engineer" has been updated to: SHORTLISTED.', is_read: true },
      { user_id: userMap['lina@gmail.com'].id,   message: 'Your application for "Mobile Developer (Flutter)" has been updated to: REJECTED.', is_read: false },
    ];
    await Notification.bulkCreate(notifData);
    log.push(`✅ ${notifData.length} notifications seeded`);

    return res.status(200).json({
      success: true,
      message: '🌱 Database seeded successfully!',
      log,
      credentials: {
        admin:      { email: 'admin@revup.com',    password: 'Admin@1234' },
        recruiter1: { email: 'sara@techcorp.com',  password: 'Recruiter@1234' },
        recruiter2: { email: 'omar@innovatex.com', password: 'Recruiter@1234' },
        seeker1:    { email: 'ahmed@gmail.com',    password: 'Seeker@1234' },
        seeker2:    { email: 'nour@gmail.com',     password: 'Seeker@1234' },
        seeker3:    { email: 'kareem@gmail.com',   password: 'Seeker@1234' },
        seeker4:    { email: 'lina@gmail.com',     password: 'Seeker@1234' },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Seeding failed.', error: err.message });
  }
});

module.exports = router;
