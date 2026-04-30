'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('./src/config/db');
const {
  User, Company, Job, Skill, Application, Notification,
} = require('./src/models');

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('  Connected to MySQL.');

    // ─────────────────────────────────────────────────────────────────────────
    // 1. SKILLS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n  Seeding skills...');
    const skillData = [
      'JavaScript', 'TypeScript', 'React.js', 'Next.js', 'Vue.js',
      'Node.js', 'Express.js', 'Python', 'Django', 'FastAPI',
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker',
      'AWS', 'Git', 'REST API', 'GraphQL', 'Tailwind CSS',
      'Flutter', 'React Native', 'Java', 'Spring Boot', 'C#',
      'Figma', 'UI/UX Design', 'Agile/Scrum', 'DevOps', 'Kubernetes',
    ];
    const skills = await Skill.bulkCreate(
      skillData.map((name) => ({ name })),
      { ignoreDuplicates: true }
    );
    const allSkills = await Skill.findAll();
    const skillMap = Object.fromEntries(allSkills.map((s) => [s.name, s.id]));
    console.log(`    ${allSkills.length} skills created.`);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. USERS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n  Seeding users...');
    const hash = (pw) => bcrypt.hashSync(pw, 10);

    const usersData = [
      // Admin
      {
        name: 'Admin RevUp',
        email: 'admin@revup.com',
        password: hash('Admin@1234'),
        role: 'admin',
        bio: 'Platform administrator.',
      },
      // Recruiters
      {
        name: 'Sara Hassan',
        email: 'sara@techcorp.com',
        password: hash('Recruiter@1234'),
        role: 'recruiter',
        bio: 'HR Manager at TechCorp. Passionate about building great teams.',
      },
      {
        name: 'Omar Khalil',
        email: 'omar@innovatex.com',
        password: hash('Recruiter@1234'),
        role: 'recruiter',
        bio: 'Talent Acquisition Lead at InnovateX.',
      },
      // Seekers
      {
        name: 'Ahmed Ali',
        email: 'ahmed@gmail.com',
        password: hash('Seeker@1234'),
        role: 'seeker',
        bio: 'Full-stack developer with 3 years of experience in Node.js & React.',
        resume_url: null,
      },
      {
        name: 'Nour Youssef',
        email: 'nour@gmail.com',
        password: hash('Seeker@1234'),
        role: 'seeker',
        bio: 'Frontend developer specializing in React.js & Tailwind CSS.',
      },
      {
        name: 'Kareem Samir',
        email: 'kareem@gmail.com',
        password: hash('Seeker@1234'),
        role: 'seeker',
        bio: 'Backend engineer focused on Python, Django, and cloud infrastructure.',
      },
      {
        name: 'Lina Mostafa',
        email: 'lina@gmail.com',
        password: hash('Seeker@1234'),
        role: 'seeker',
        bio: 'Mobile developer with expertise in Flutter and React Native.',
      },
    ];

    await User.bulkCreate(usersData, { ignoreDuplicates: true });
    const allUsers = await User.findAll();
    const userMap = Object.fromEntries(allUsers.map((u) => [u.email, u]));
    console.log(`   ✔ ${allUsers.length} users created.`);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. USER SKILLS (Seekers only)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n  Seeding user skills...');
    const seekerSkillMap = {
      'ahmed@gmail.com':  ['JavaScript', 'Node.js', 'React.js', 'MySQL', 'REST API', 'Git', 'Docker'],
      'nour@gmail.com':   ['React.js', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Figma', 'Git'],
      'kareem@gmail.com': ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Docker', 'AWS', 'Git'],
      'lina@gmail.com':   ['Flutter', 'React Native', 'JavaScript', 'Firebase', 'Git', 'Figma'],
    };
    for (const [email, skills] of Object.entries(seekerSkillMap)) {
      const user = userMap[email];
      if (user) {
        const ids = skills.map((s) => skillMap[s]).filter(Boolean);
        await user.setSkills(ids);
      }
    }
    console.log('   ✔ User skills assigned.');

    // ─────────────────────────────────────────────────────────────────────────
    // 4. COMPANIES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n  Seeding companies...');
    const [techCorp] = await Company.findOrCreate({
      where: { recruiter_id: userMap['sara@techcorp.com'].id },
      defaults: {
        name: 'TechCorp Solutions',
        website: 'https://techcorp.com',
        description: 'TechCorp is a leading software consultancy delivering innovative digital solutions across MENA.',
        recruiter_id: userMap['sara@techcorp.com'].id,
      },
    });
    const [innovateX] = await Company.findOrCreate({
      where: { recruiter_id: userMap['omar@innovatex.com'].id },
      defaults: {
        name: 'InnovateX Labs',
        website: 'https://innovatex.io',
        description: 'InnovateX is a product startup building the next generation of SaaS tools for SMEs.',
        recruiter_id: userMap['omar@innovatex.com'].id,
      },
    });
    console.log('   ✔ 2 companies created.');

    // ─────────────────────────────────────────────────────────────────────────
    // 5. JOBS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n  Seeding jobs...');
    const jobsData = [
      // TechCorp jobs
      {
        title: 'Senior Full-Stack Developer',
        description: 'We are looking for an experienced Full-Stack Developer to join our core engineering team. You will design and build scalable web applications using Node.js and React.',
        location: 'Cairo, Egypt',
        job_type: 'Full-time',
        salary_range: '$2,500 - $4,000/month',
        status: 'open',
        company_id: techCorp.id,
        skills: ['JavaScript', 'Node.js', 'React.js', 'MySQL', 'REST API', 'Docker', 'Git'],
      },
      {
        title: 'Frontend Engineer (React.js)',
        description: 'Join our product team to craft beautiful, responsive UIs for our SaaS platform. Experience with React, TypeScript, and Tailwind is required.',
        location: 'Remote',
        job_type: 'Remote',
        salary_range: '$1,800 - $3,000/month',
        status: 'open',
        company_id: techCorp.id,
        skills: ['React.js', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Git'],
      },
      {
        title: 'DevOps / Cloud Engineer',
        description: 'Maintain and scale our cloud infrastructure on AWS. Experience with Docker, Kubernetes, and CI/CD pipelines is a must.',
        location: 'Cairo, Egypt',
        job_type: 'Full-time',
        salary_range: '$3,000 - $5,000/month',
        status: 'open',
        company_id: techCorp.id,
        skills: ['AWS', 'Docker', 'Kubernetes', 'DevOps', 'Git'],
      },
      {
        title: 'Junior Backend Developer (Node.js)',
        description: 'Great entry-level opportunity for a backend developer. You will work on REST APIs, database design, and server-side logic.',
        location: 'Alexandria, Egypt',
        job_type: 'Full-time',
        salary_range: '$800 - $1,500/month',
        status: 'open',
        company_id: techCorp.id,
        skills: ['JavaScript', 'Node.js', 'Express.js', 'MySQL', 'REST API'],
      },
      {
        title: 'UI/UX Designer',
        description: 'We need a creative designer to lead our product design efforts. You will own the full design cycle from wireframes to high-fidelity prototypes.',
        location: 'Remote',
        job_type: 'Part-time',
        salary_range: '$1,200 - $2,000/month',
        status: 'closed',
        company_id: techCorp.id,
        skills: ['Figma', 'UI/UX Design', 'Tailwind CSS'],
      },
      // InnovateX jobs
      {
        title: 'Python Backend Engineer',
        description: 'InnovateX is hiring a Python engineer to build scalable microservices using Django and FastAPI. Cloud experience is a big plus.',
        location: 'Remote',
        job_type: 'Remote',
        salary_range: '$2,000 - $3,500/month',
        status: 'open',
        company_id: innovateX.id,
        skills: ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Docker', 'AWS'],
      },
      {
        title: 'Mobile Developer (Flutter)',
        description: 'Build cross-platform mobile applications for our SaaS clients. Strong Flutter skills and knowledge of REST APIs is required.',
        location: 'Cairo, Egypt',
        job_type: 'Full-time',
        salary_range: '$1,500 - $2,500/month',
        status: 'open',
        company_id: innovateX.id,
        skills: ['Flutter', 'React Native', 'JavaScript', 'REST API', 'Git'],
      },
      {
        title: 'Data Engineer / Database Admin',
        description: 'Manage and optimize our data pipelines and database clusters. Experience with PostgreSQL, Redis, and MongoDB required.',
        location: 'Hybrid',
        job_type: 'Hybrid',
        salary_range: '$2,000 - $3,000/month',
        status: 'open',
        company_id: innovateX.id,
        skills: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Python'],
      },
    ];

    const createdJobs = [];
    for (const { skills: jobSkills, ...jobInfo } of jobsData) {
      const [job] = await Job.findOrCreate({ where: { title: jobInfo.title, company_id: jobInfo.company_id }, defaults: jobInfo });
      const ids = jobSkills.map((s) => skillMap[s]).filter(Boolean);
      await job.setSkills(ids);
      createdJobs.push(job);
    }
    console.log(`    ${createdJobs.length} jobs created with skills.`);

    // ─────────────────────────────────────────────────────────────────────────
    // 6. APPLICATIONS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n  Seeding applications...');
    const appData = [
      // Ahmed applies to 2 TechCorp jobs
      { job_id: createdJobs[0].id, seeker_id: userMap['ahmed@gmail.com'].id, status: 'shortlisted', cover_letter: 'I am a passionate full-stack developer with 3 years of experience. I believe I am a great fit for this role.' },
      { job_id: createdJobs[1].id, seeker_id: userMap['ahmed@gmail.com'].id, status: 'applied',     cover_letter: 'I love building clean and responsive UIs. React is my primary stack.' },
      // Nour applies to frontend job
      { job_id: createdJobs[1].id, seeker_id: userMap['nour@gmail.com'].id,  status: 'hired',       cover_letter: 'Frontend is my passion. I have 2 years of React.js experience and a strong portfolio.' },
      // Kareem applies to Python job
      { job_id: createdJobs[5].id, seeker_id: userMap['kareem@gmail.com'].id, status: 'shortlisted', cover_letter: 'Python is my primary language. I have built production-grade Django APIs for enterprise clients.' },
      { job_id: createdJobs[7].id, seeker_id: userMap['kareem@gmail.com'].id, status: 'applied',     cover_letter: 'I have extensive experience with PostgreSQL, Redis, and MongoDB in high-traffic environments.' },
      // Lina applies to mobile job
      { job_id: createdJobs[6].id, seeker_id: userMap['lina@gmail.com'].id,  status: 'rejected',    cover_letter: 'Flutter is my specialty. I have published 3 apps on both the App Store and Google Play.' },
      // Ahmed applies to junior backend
      { job_id: createdJobs[3].id, seeker_id: userMap['ahmed@gmail.com'].id, status: 'applied',     cover_letter: 'Looking for a new challenge in backend development.' },
    ];

    for (const app of appData) {
      await Application.findOrCreate({ where: { job_id: app.job_id, seeker_id: app.seeker_id }, defaults: app });
    }
    console.log(`    ${appData.length} applications created.`);

    // ─────────────────────────────────────────────────────────────────────────
    // 7. NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n  Seeding notifications...');
    const notifData = [
      { user_id: userMap['ahmed@gmail.com'].id,  message: 'Your application for "Senior Full-Stack Developer" at TechCorp Solutions has been updated to: SHORTLISTED.', is_read: false },
      { user_id: userMap['nour@gmail.com'].id,   message: 'Your application for "Frontend Engineer (React.js)" at TechCorp Solutions has been updated to: HIRED. Congratulations! 🎉', is_read: false },
      { user_id: userMap['kareem@gmail.com'].id, message: 'Your application for "Python Backend Engineer" at InnovateX Labs has been updated to: SHORTLISTED.', is_read: true },
      { user_id: userMap['lina@gmail.com'].id,   message: 'Your application for "Mobile Developer (Flutter)" at InnovateX Labs has been updated to: REJECTED.', is_read: false },
      { user_id: userMap['ahmed@gmail.com'].id,  message: 'New job posted matching your skills: "Junior Backend Developer (Node.js)" at TechCorp Solutions.', is_read: true },
    ];

    await Notification.bulkCreate(notifData);
    console.log(`    ${notifData.length} notifications created.`);

    // ─────────────────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n────────────────────────────────────────────');
    console.log('  DATABASE SEEDED SUCCESSFULLY!');
    console.log('────────────────────────────────────────────');
    console.log('  Login Credentials:');
    console.log('');
    console.log('     Admin:');
    console.log('       Email:    admin@revup.com');
    console.log('       Password: Admin@1234');
    console.log('');
    console.log('     Recruiter 1 (TechCorp):');
    console.log('       Email:    sara@techcorp.com');
    console.log('       Password: Recruiter@1234');
    console.log('');
    console.log('     Recruiter 2 (InnovateX):');
    console.log('       Email:    omar@innovatex.com');
    console.log('       Password: Recruiter@1234');
    console.log('');
    console.log('     Seeker 1 (Full-Stack):');
    console.log('       Email:    ahmed@gmail.com');
    console.log('       Password: Seeker@1234');
    console.log('');
    console.log('     Seeker 2 (Frontend):');
    console.log('       Email:    nour@gmail.com');
    console.log('       Password: Seeker@1234');
    console.log('');
    console.log('     Seeker 3 (Backend/Python):');
    console.log('       Email:    kareem@gmail.com');
    console.log('       Password: Seeker@1234');
    console.log('');
    console.log('     Seeker 4 (Mobile):');
    console.log('       Email:    lina@gmail.com');
    console.log('       Password: Seeker@1234');
    console.log('────────────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('  Seeding failed:', err.message);
    process.exit(1);
  }
};

seed();