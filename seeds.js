'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('./src/config/db');
const {
  User, Company, Job, Skill, Application, Notification,
  Course, Lesson, Enrollment, LessonProgress,
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
      // Recruiter 3
      {
        name: 'Rania Fawzy',
        email: 'rania@nexasoft.com',
        password: hash('Recruiter@1234'),
        role: 'recruiter',
        bio: 'Head of Talent at NexaSoft. Focused on hiring top engineering talent across Egypt and the Gulf.',
      },
      // Recruiter 4
      {
        name: 'Khaled Mansour',
        email: 'khaled@cloudpeak.io',
        password: hash('Recruiter@1234'),
        role: 'recruiter',
        bio: 'Engineering Recruiter at CloudPeak Systems. Specialist in DevOps and cloud-native talent.',
      },
      // Recruiter 5
      {
        name: 'Dina Ramzy',
        email: 'dina@dataforge.ai',
        password: hash('Recruiter@1234'),
        role: 'recruiter',
        bio: 'Talent Partner at DataForge Analytics. Focused on data engineering and AI/ML roles.',
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
      // New seekers
      {
        name: 'Youssef Adel',
        email: 'youssef@gmail.com',
        password: hash('Seeker@1234'),
        role: 'seeker',
        bio: 'Java & Spring Boot developer with a strong interest in microservices and cloud-native architectures.',
      },
      {
        name: 'Salma Tarek',
        email: 'salma@gmail.com',
        password: hash('Seeker@1234'),
        role: 'seeker',
        bio: 'Data engineer with hands-on experience in PostgreSQL, MongoDB, and building ETL pipelines.',
      },
      {
        name: 'Hassan Nabil',
        email: 'hassan@gmail.com',
        password: hash('Seeker@1234'),
        role: 'seeker',
        bio: 'GraphQL & Node.js specialist. Passionate about API design, performance tuning, and developer experience.',
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
      'ahmed@gmail.com':   ['JavaScript', 'Node.js', 'React.js', 'MySQL', 'REST API', 'Git', 'Docker'],
      'nour@gmail.com':    ['React.js', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Figma', 'Git'],
      'kareem@gmail.com':  ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Docker', 'AWS', 'Git'],
      'lina@gmail.com':    ['Flutter', 'React Native', 'JavaScript', 'Git', 'Figma'],
      'youssef@gmail.com': ['Java', 'Spring Boot', 'MySQL', 'Docker', 'Kubernetes', 'AWS', 'Git'],
      'salma@gmail.com':   ['PostgreSQL', 'MongoDB', 'Redis', 'Python', 'AWS', 'Git'],
      'hassan@gmail.com':  ['GraphQL', 'Node.js', 'TypeScript', 'REST API', 'MongoDB', 'Docker', 'Git'],
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

    // New companies — Rania owns NexaSoft; Sara & Omar each get a second brand
    const [nexaSoft] = await Company.findOrCreate({
      where: { recruiter_id: userMap['rania@nexasoft.com'].id },
      defaults: {
        name: 'NexaSoft Technologies',
        website: 'https://nexasoft.com',
        description: 'NexaSoft builds enterprise-grade software solutions for logistics, fintech, and e-commerce sectors across the MENA region.',
        recruiter_id: userMap['rania@nexasoft.com'].id,
      },
    });
    const [cloudPeak] = await Company.findOrCreate({
      where: { recruiter_id: userMap['khaled@cloudpeak.io'].id },
      defaults: {
        name: 'CloudPeak Systems',
        website: 'https://cloudpeak.io',
        description: 'CloudPeak specializes in cloud-native infrastructure, managed Kubernetes services, and DevOps consulting for fast-growing startups.',
        recruiter_id: userMap['khaled@cloudpeak.io'].id,
      },
    });
    const [dataForge] = await Company.findOrCreate({
      where: { recruiter_id: userMap['dina@dataforge.ai'].id },
      defaults: {
        name: 'DataForge Analytics',
        website: 'https://dataforge.ai',
        description: 'DataForge is a data engineering and AI company helping enterprises turn raw data into actionable insights through scalable pipelines.',
        recruiter_id: userMap['dina@dataforge.ai'].id,
      },
    });
    console.log('   ✔ 3 new companies created (NexaSoft, CloudPeak, DataForge).');

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
      // ── NexaSoft jobs ──────────────────────────────────────────────────────
      {
        title: 'Java Backend Engineer',
        description: 'NexaSoft is looking for a Java engineer to build and maintain high-throughput microservices using Spring Boot. Experience with containerisation and cloud deployment is essential.',
        location: 'Cairo, Egypt',
        job_type: 'Full-time',
        salary_range: '$2,000 - $3,500/month',
        status: 'open',
        company_id: nexaSoft.id,
        skills: ['Java', 'Spring Boot', 'MySQL', 'Docker', 'AWS', 'Git'],
      },
      {
        title: 'GraphQL API Developer',
        description: 'Design and implement GraphQL APIs for our customer-facing SaaS platform. Strong Node.js background and experience with schema design and performance optimisation required.',
        location: 'Remote',
        job_type: 'Remote',
        salary_range: '$1,800 - $3,000/month',
        status: 'open',
        company_id: nexaSoft.id,
        skills: ['GraphQL', 'Node.js', 'TypeScript', 'MongoDB', 'Docker', 'Git'],
      },
      // ── CloudPeak jobs ─────────────────────────────────────────────────────
      {
        title: 'Senior DevOps Engineer',
        description: 'Lead infrastructure automation and cloud operations for our managed Kubernetes platform. Deep hands-on experience with AWS, Terraform, and Helm charts is required.',
        location: 'Remote',
        job_type: 'Remote',
        salary_range: '$3,500 - $5,500/month',
        status: 'open',
        company_id: cloudPeak.id,
        skills: ['Kubernetes', 'Docker', 'AWS', 'DevOps', 'Git'],
      },
      {
        title: 'Backend Engineer (Node.js & GraphQL)',
        description: 'Build scalable backend services and internal developer tooling for our cloud platform. You will own API design, performance, and reliability.',
        location: 'Hybrid',
        job_type: 'Hybrid',
        salary_range: '$2,200 - $3,800/month',
        status: 'open',
        company_id: cloudPeak.id,
        skills: ['Node.js', 'GraphQL', 'TypeScript', 'REST API', 'Docker', 'Git'],
      },
      // ── DataForge jobs ─────────────────────────────────────────────────────
      {
        title: 'Data Engineer',
        description: 'Design and maintain large-scale ETL pipelines and data warehouses. Strong SQL, Python, and experience with columnar databases and streaming tools required.',
        location: 'Cairo, Egypt',
        job_type: 'Full-time',
        salary_range: '$2,000 - $3,200/month',
        status: 'open',
        company_id: dataForge.id,
        skills: ['PostgreSQL', 'MongoDB', 'Redis', 'Python', 'AWS', 'Git'],
      },
      {
        title: 'Database Administrator (PostgreSQL)',
        description: 'Own the performance, reliability, and security of our PostgreSQL clusters. Experience with replication, partitioning, query tuning, and backup strategies is a must.',
        location: 'Alexandria, Egypt',
        job_type: 'Full-time',
        salary_range: '$1,800 - $2,800/month',
        status: 'open',
        company_id: dataForge.id,
        skills: ['PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Git'],
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
      // Youssef applies to Java & DevOps roles
      { job_id: createdJobs[8].id,  seeker_id: userMap['youssef@gmail.com'].id, status: 'applied',      cover_letter: 'Java and Spring Boot are my core expertise. I have built microservices handling 10k+ req/s in production.' },
      { job_id: createdJobs[10].id, seeker_id: userMap['youssef@gmail.com'].id, status: 'shortlisted',  cover_letter: 'I am deeply familiar with Kubernetes and cloud-native DevOps. Excited about CloudPeak\'s infrastructure focus.' },
      // Hassan applies to GraphQL & Node.js roles
      { job_id: createdJobs[9].id,  seeker_id: userMap['hassan@gmail.com'].id,  status: 'shortlisted',  cover_letter: 'GraphQL API design is my specialty. I have led schema-first development teams and optimised resolver performance at scale.' },
      { job_id: createdJobs[11].id, seeker_id: userMap['hassan@gmail.com'].id,  status: 'applied',      cover_letter: 'Strong Node.js and GraphQL background. Looking for a role where I can own the full API layer.' },
      // Salma applies to data roles
      { job_id: createdJobs[12].id, seeker_id: userMap['salma@gmail.com'].id,   status: 'hired',        cover_letter: 'I have 4 years of experience building ETL pipelines with Python and PostgreSQL for enterprise clients.' },
      { job_id: createdJobs[13].id, seeker_id: userMap['salma@gmail.com'].id,   status: 'applied',      cover_letter: 'PostgreSQL DBA with hands-on experience in replication, partitioning, and query tuning in high-traffic systems.' },
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
      // New seekers
      { user_id: userMap['youssef@gmail.com'].id, message: 'Your application for "Java Backend Engineer" at NexaSoft Technologies has been received.', is_read: false },
      { user_id: userMap['youssef@gmail.com'].id, message: 'Your application for "Senior DevOps Engineer" at CloudPeak Systems has been updated to: SHORTLISTED.', is_read: false },
      { user_id: userMap['hassan@gmail.com'].id,  message: 'Your application for "GraphQL API Developer" at NexaSoft Technologies has been updated to: SHORTLISTED.', is_read: false },
      { user_id: userMap['hassan@gmail.com'].id,  message: 'New job matching your skills: "Backend Engineer (Node.js & GraphQL)" at CloudPeak Systems.', is_read: true },
      { user_id: userMap['salma@gmail.com'].id,   message: 'Congratulations! Your application for "Data Engineer" at DataForge Analytics has been updated to: HIRED. 🎉', is_read: false },
      { user_id: userMap['salma@gmail.com'].id,   message: 'Your application for "Database Administrator (PostgreSQL)" at DataForge Analytics has been received.', is_read: true },
    ];

    await Notification.bulkCreate(notifData);
    console.log(`    ${notifData.length} notifications created.`);

    // ─────────────────────────────────────────────────────────────────────────
    // 8. COURSES  (created by admin)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n  Seeding courses...');
    const adminId = userMap['admin@revup.com'].id;

    const coursesData = [
      {
        title: 'Full-Stack JavaScript Bootcamp',
        description: 'Master modern full-stack development from scratch. Covers Node.js, Express, React, and MySQL with hands-on projects.',
        thumbnail: 'https://cdn.revup.com/courses/fullstack-js.jpg',
        category: 'Web Development',
        level: 'beginner',
        status: 'published',
        admin_id: adminId,
      },
      {
        title: 'React.js — From Zero to Hero',
        description: 'A deep dive into React 18, hooks, context, React Router, and state management with Redux Toolkit and React Query.',
        thumbnail: 'https://cdn.revup.com/courses/react-hero.jpg',
        category: 'Frontend',
        level: 'intermediate',
        status: 'published',
        admin_id: adminId,
      },
      {
        title: 'Python & Django REST API Mastery',
        description: 'Build production-ready REST APIs using Python, Django, and Django REST Framework. Includes JWT auth and deployment.',
        thumbnail: 'https://cdn.revup.com/courses/python-django.jpg',
        category: 'Backend',
        level: 'intermediate',
        status: 'published',
        admin_id: adminId,
      },
      {
        title: 'Flutter Mobile Development',
        description: 'Build beautiful cross-platform iOS and Android apps using Flutter and Dart. From UI basics to state management with Riverpod.',
        thumbnail: 'https://cdn.revup.com/courses/flutter.jpg',
        category: 'Mobile Development',
        level: 'beginner',
        status: 'published',
        admin_id: adminId,
      },
      {
        title: 'DevOps & Cloud Engineering with AWS',
        description: 'Learn CI/CD pipelines, Docker, Kubernetes, and AWS services (EC2, S3, RDS, Lambda) to deploy and scale applications.',
        thumbnail: 'https://cdn.revup.com/courses/devops-aws.jpg',
        category: 'DevOps',
        level: 'advanced',
        status: 'published',
        admin_id: adminId,
      },
      {
        title: 'UI/UX Design Fundamentals with Figma',
        description: 'Learn design thinking, wireframing, prototyping, and handoff workflows using Figma. Includes real-world case studies.',
        thumbnail: 'https://cdn.revup.com/courses/uiux-figma.jpg',
        category: 'Design',
        level: 'beginner',
        status: 'draft',
        admin_id: adminId,
      },
    ];

    const createdCourses = [];
    for (const courseInfo of coursesData) {
      const [course] = await Course.findOrCreate({
        where: { title: courseInfo.title, admin_id: courseInfo.admin_id },
        defaults: courseInfo,
      });
      createdCourses.push(course);
    }
    console.log(`   ✔ ${createdCourses.length} courses created.`);

    // ─────────────────────────────────────────────────────────────────────────
    // 9. LESSONS  (3–5 lessons per published course)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n  Seeding lessons...');

    // Helper: resolve youtube_url as a real-looking but non-existent placeholder
    const yt = (id) => `https://www.youtube.com/watch?v=${id}`;

    const lessonsData = [
      // ── Course 0: Full-Stack JavaScript Bootcamp ──────────────────────────
      { course_id: createdCourses[0].id, order: 1, title: 'Introduction & Environment Setup',        youtube_url: yt('fsjs_01'), duration_minutes: 18 },
      { course_id: createdCourses[0].id, order: 2, title: 'JavaScript ES6+ Refresher',               youtube_url: yt('fsjs_02'), duration_minutes: 32 },
      { course_id: createdCourses[0].id, order: 3, title: 'Building REST APIs with Express.js',      youtube_url: yt('fsjs_03'), duration_minutes: 45 },
      { course_id: createdCourses[0].id, order: 4, title: 'MySQL & Sequelize ORM',                   youtube_url: yt('fsjs_04'), duration_minutes: 40 },
      { course_id: createdCourses[0].id, order: 5, title: 'React UI & Connecting to the API',        youtube_url: yt('fsjs_05'), duration_minutes: 55 },

      // ── Course 1: React.js — From Zero to Hero ────────────────────────────
      { course_id: createdCourses[1].id, order: 1, title: 'React Fundamentals & JSX',                youtube_url: yt('react_01'), duration_minutes: 25 },
      { course_id: createdCourses[1].id, order: 2, title: 'Hooks: useState, useEffect & useRef',     youtube_url: yt('react_02'), duration_minutes: 38 },
      { course_id: createdCourses[1].id, order: 3, title: 'Context API & useReducer',                youtube_url: yt('react_03'), duration_minutes: 30 },
      { course_id: createdCourses[1].id, order: 4, title: 'React Router v6 & Protected Routes',      youtube_url: yt('react_04'), duration_minutes: 28 },
      { course_id: createdCourses[1].id, order: 5, title: 'State Management with Redux Toolkit',     youtube_url: yt('react_05'), duration_minutes: 42 },

      // ── Course 2: Python & Django REST API Mastery ────────────────────────
      { course_id: createdCourses[2].id, order: 1, title: 'Python Crash Course for Backend Dev',     youtube_url: yt('dj_01'), duration_minutes: 35 },
      { course_id: createdCourses[2].id, order: 2, title: 'Django Project Structure & Models',       youtube_url: yt('dj_02'), duration_minutes: 40 },
      { course_id: createdCourses[2].id, order: 3, title: 'Django REST Framework — Serializers',     youtube_url: yt('dj_03'), duration_minutes: 38 },
      { course_id: createdCourses[2].id, order: 4, title: 'JWT Authentication & Permissions',        youtube_url: yt('dj_04'), duration_minutes: 33 },
      { course_id: createdCourses[2].id, order: 5, title: 'Deploying Django to AWS EC2',             youtube_url: yt('dj_05'), duration_minutes: 50 },

      // ── Course 3: Flutter Mobile Development ──────────────────────────────
      { course_id: createdCourses[3].id, order: 1, title: 'Dart Language Essentials',                youtube_url: yt('fl_01'), duration_minutes: 22 },
      { course_id: createdCourses[3].id, order: 2, title: 'Flutter Widgets & Layouts',               youtube_url: yt('fl_02'), duration_minutes: 36 },
      { course_id: createdCourses[3].id, order: 3, title: 'Navigation & Routing in Flutter',         youtube_url: yt('fl_03'), duration_minutes: 28 },
      { course_id: createdCourses[3].id, order: 4, title: 'State Management with Riverpod',          youtube_url: yt('fl_04'), duration_minutes: 44 },

      // ── Course 4: DevOps & Cloud Engineering ──────────────────────────────
      { course_id: createdCourses[4].id, order: 1, title: 'Linux & Bash Scripting for DevOps',       youtube_url: yt('ops_01'), duration_minutes: 30 },
      { course_id: createdCourses[4].id, order: 2, title: 'Docker: Images, Containers & Compose',    youtube_url: yt('ops_02'), duration_minutes: 48 },
      { course_id: createdCourses[4].id, order: 3, title: 'Kubernetes Core Concepts',                youtube_url: yt('ops_03'), duration_minutes: 55 },
      { course_id: createdCourses[4].id, order: 4, title: 'AWS EC2, S3 & RDS Essentials',            youtube_url: yt('ops_04'), duration_minutes: 42 },
      { course_id: createdCourses[4].id, order: 5, title: 'CI/CD with GitHub Actions',               youtube_url: yt('ops_05'), duration_minutes: 37 },
    ];

    const createdLessons = await Lesson.bulkCreate(lessonsData, { ignoreDuplicates: true, returning: true });
    // Re-fetch to guarantee IDs regardless of DB driver behaviour
    const allLessons = await Lesson.findAll({ order: [['course_id', 'ASC'], ['order', 'ASC']] });

    // Build quick-lookup: lessonsByCourse[courseId] = [lesson, ...]
    const lessonsByCourse = {};
    for (const l of allLessons) {
      if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = [];
      lessonsByCourse[l.course_id].push(l);
    }
    console.log(`   ✔ ${allLessons.length} lessons created.`);

    // ─────────────────────────────────────────────────────────────────────────
    // 10. ENROLLMENTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n  Seeding enrollments...');

    // Ahmed  → Full-Stack JS (completed) + React Hero (in progress)
    // Nour   → React Hero (completed)    + Full-Stack JS (in progress)
    // Kareem → Python/Django (completed) + DevOps (in progress)
    // Lina   → Flutter (completed)       + React Hero (in progress)
    const enrollmentsData = [
      { user_id: userMap['ahmed@gmail.com'].id,  course_id: createdCourses[0].id, completed_at: new Date('2025-02-10') },
      { user_id: userMap['ahmed@gmail.com'].id,  course_id: createdCourses[1].id, completed_at: null },
      { user_id: userMap['nour@gmail.com'].id,   course_id: createdCourses[1].id, completed_at: new Date('2025-03-01') },
      { user_id: userMap['nour@gmail.com'].id,   course_id: createdCourses[0].id, completed_at: null },
      { user_id: userMap['kareem@gmail.com'].id, course_id: createdCourses[2].id, completed_at: new Date('2025-01-20') },
      { user_id: userMap['kareem@gmail.com'].id, course_id: createdCourses[4].id, completed_at: null },
      { user_id: userMap['lina@gmail.com'].id,   course_id: createdCourses[3].id, completed_at: new Date('2025-04-05') },
      { user_id: userMap['lina@gmail.com'].id,   course_id: createdCourses[1].id, completed_at: null },
      // New seekers
      { user_id: userMap['youssef@gmail.com'].id, course_id: createdCourses[4].id, completed_at: new Date('2025-03-15') }, // DevOps completed
      { user_id: userMap['youssef@gmail.com'].id, course_id: createdCourses[0].id, completed_at: null },                  // Full-Stack JS in progress
      { user_id: userMap['salma@gmail.com'].id,   course_id: createdCourses[2].id, completed_at: new Date('2025-02-28') }, // Python/Django completed
      { user_id: userMap['salma@gmail.com'].id,   course_id: createdCourses[4].id, completed_at: null },                  // DevOps in progress
      { user_id: userMap['hassan@gmail.com'].id,  course_id: createdCourses[0].id, completed_at: new Date('2025-01-10') }, // Full-Stack JS completed
      { user_id: userMap['hassan@gmail.com'].id,  course_id: createdCourses[2].id, completed_at: null },                  // Python/Django in progress
    ];

    const createdEnrollments = [];
    for (const e of enrollmentsData) {
      const [enrollment] = await Enrollment.findOrCreate({
        where: { user_id: e.user_id, course_id: e.course_id },
        defaults: e,
      });
      createdEnrollments.push(enrollment);
    }
    console.log(`   ✔ ${createdEnrollments.length} enrollments created.`);

    // ─────────────────────────────────────────────────────────────────────────
    // 11. LESSON PROGRESS
    //     • Completed enrollments  → all lessons done
    //     • In-progress enrollments → first 2 lessons done
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n  Seeding lesson progress...');

    const progressData = [];
    const now = new Date();

    const addProgress = (userId, courseId, completedCount) => {
      const lessons = lessonsByCourse[courseId] || [];
      lessons.forEach((lesson, idx) => {
        const done = idx < completedCount;
        progressData.push({
          user_id:      userId,
          lesson_id:    lesson.id,
          completed:    done,
          completed_at: done ? now : null,
        });
      });
    };

    const ahmedId  = userMap['ahmed@gmail.com'].id;
    const nourId   = userMap['nour@gmail.com'].id;
    const kareemId = userMap['kareem@gmail.com'].id;
    const linaId   = userMap['lina@gmail.com'].id;

    // Ahmed: Full-Stack JS fully done (5 lessons), React Hero 2/5 done
    addProgress(ahmedId,  createdCourses[0].id, 5);
    addProgress(ahmedId,  createdCourses[1].id, 2);

    // Nour: React Hero fully done (5 lessons), Full-Stack JS 2/5 done
    addProgress(nourId,   createdCourses[1].id, 5);
    addProgress(nourId,   createdCourses[0].id, 2);

    // Kareem: Python/Django fully done (5 lessons), DevOps 2/5 done
    addProgress(kareemId, createdCourses[2].id, 5);
    addProgress(kareemId, createdCourses[4].id, 2);

    // Lina: Flutter fully done (4 lessons), React Hero 2/5 done
    addProgress(linaId,   createdCourses[3].id, 4);
    addProgress(linaId,   createdCourses[1].id, 2);

    const youssefId = userMap['youssef@gmail.com'].id;
    const salmaId   = userMap['salma@gmail.com'].id;
    const hassanId  = userMap['hassan@gmail.com'].id;

    // Youssef: DevOps fully done (5 lessons), Full-Stack JS 2/5 done
    addProgress(youssefId, createdCourses[4].id, 5);
    addProgress(youssefId, createdCourses[0].id, 2);

    // Salma: Python/Django fully done (5 lessons), DevOps 2/5 done
    addProgress(salmaId,   createdCourses[2].id, 5);
    addProgress(salmaId,   createdCourses[4].id, 2);

    // Hassan: Full-Stack JS fully done (5 lessons), Python/Django 2/5 done
    addProgress(hassanId,  createdCourses[0].id, 5);
    addProgress(hassanId,  createdCourses[2].id, 2);

    for (const p of progressData) {
      await LessonProgress.findOrCreate({
        where: { user_id: p.user_id, lesson_id: p.lesson_id },
        defaults: p,
      });
    }
    console.log(`   ✔ ${progressData.length} lesson progress records created.`);

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
    console.log('     Recruiter 1 (TechCorp / CloudPeak):');
    console.log('       Email:    sara@techcorp.com');
    console.log('       Password: Recruiter@1234');
    console.log('');
    console.log('     Recruiter 2 (InnovateX / DataForge):');
    console.log('       Email:    omar@innovatex.com');
    console.log('       Password: Recruiter@1234');
    console.log('');
    console.log('     Recruiter 3 (NexaSoft):');
    console.log('       Email:    rania@nexasoft.com');
    console.log('       Password: Recruiter@1234');
    console.log('');
    console.log('     Recruiter 4 (CloudPeak):');
    console.log('       Email:    khaled@cloudpeak.io');
    console.log('       Password: Recruiter@1234');
    console.log('');
    console.log('     Recruiter 5 (DataForge):');
    console.log('       Email:    dina@dataforge.ai');
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
    console.log('');
    console.log('     Seeker 5 (Java/DevOps):');
    console.log('       Email:    youssef@gmail.com');
    console.log('       Password: Seeker@1234');
    console.log('');
    console.log('     Seeker 6 (Data Engineer):');
    console.log('       Email:    salma@gmail.com');
    console.log('       Password: Seeker@1234');
    console.log('');
    console.log('     Seeker 7 (GraphQL/Node.js):');
    console.log('       Email:    hassan@gmail.com');
    console.log('       Password: Seeker@1234');
    console.log('────────────────────────────────────────────');
    console.log('  Companies: TechCorp, InnovateX, NexaSoft, CloudPeak, DataForge');
    console.log('────────────────────────────────────────────');
    console.log('  Courses seeded:');
    createdCourses.forEach((c) => {
      const count = (lessonsByCourse[c.id] || []).length;
      console.log(`    [${c.status.toUpperCase()}] ${c.title} (${count} lessons)`);
    });
    console.log('────────────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('  Seeding failed:', err.message);
    process.exit(1);
  }
};

seed();
