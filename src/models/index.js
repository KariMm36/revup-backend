'use strict';

// ─── Phase 1 & 2 Models ───────────────────────────────────────────────────────
const User            = require('./User');
const RefreshToken    = require('./RefreshToken');
const Company         = require('./Company');
const Job             = require('./Job');
const Skill           = require('./Skill');
const Application     = require('./Application');
const Notification    = require('./Notification');
const UserSkill       = require('./UserSkill');
const JobSkill        = require('./JobSkill');
const SavedJob        = require('./SavedJob');
const Experience      = require('./Experience');
const Education       = require('./Education');
const Certification   = require('./Certification');

// ─── Phase 3 — Courses Models ─────────────────────────────────────────────────
const Course          = require('./Course');
const Lesson          = require('./Lesson');
const Enrollment      = require('./Enrollment');
const LessonProgress  = require('./LessonProgress');

// ─── Phase 4 — Interview Agent ───────────────────────────────────────────────
const Interview           = require('./Interview');
const InterviewSchedule   = require('./InterviewSchedule');



// ═══════════════════════════════════════════════════════════════════════════════
// ASSOCIATIONS — Phase 1 & 2
// ═══════════════════════════════════════════════════════════════════════════════

// ─── User <-> RefreshToken ────────────────────────────────────────────────────
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ─── User <-> Company (Owner) ─────────────────────────────────────────────────
// The recruiter_id on Company is the OWNER who created the company.
User.hasOne(Company, { foreignKey: 'recruiter_id', as: 'ownedCompany', onDelete: 'CASCADE' });
Company.belongsTo(User, { foreignKey: 'recruiter_id', as: 'owner' });

// ─── Company <-> User (Assigned Recruiters) ───────────────────────────────────
// A Company can have many Recruiters assigned via users.company_id
Company.hasMany(User, { foreignKey: 'company_id', as: 'recruiters' });
User.belongsTo(Company, { foreignKey: 'company_id', as: 'assignedCompany' });

// ─── Company <-> Job ─────────────────────────────────────────────────────────
Company.hasMany(Job, { foreignKey: 'company_id', as: 'jobs', onDelete: 'CASCADE' });
Job.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// ─── User (Seeker) <-> Application ──────────────────────────────────────────
User.hasMany(Application, { foreignKey: 'seeker_id', as: 'applications', onDelete: 'CASCADE' });
Application.belongsTo(User, { foreignKey: 'seeker_id', as: 'seeker' });

// ─── Job <-> Application ─────────────────────────────────────────────────────
Job.hasMany(Application, { foreignKey: 'job_id', as: 'applications', onDelete: 'CASCADE' });
Application.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

// ─── User <-> Notification ───────────────────────────────────────────────────
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ─── User <-> Skill (M:N via UserSkills) ─────────────────────────────────────
User.belongsToMany(Skill, { through: UserSkill, foreignKey: 'user_id', otherKey: 'skill_id', as: 'skills' });
Skill.belongsToMany(User, { through: UserSkill, foreignKey: 'skill_id', otherKey: 'user_id', as: 'users' });

// ─── Job <-> Skill (M:N via JobSkills) ───────────────────────────────────────
Job.belongsToMany(Skill, { through: JobSkill, foreignKey: 'job_id', otherKey: 'skill_id', as: 'skills' });
Skill.belongsToMany(Job, { through: JobSkill, foreignKey: 'skill_id', otherKey: 'job_id', as: 'jobs' });

// ─── User <-> Job (M:N via SavedJobs) ────────────────────────────────────────
User.belongsToMany(Job, { through: SavedJob, foreignKey: 'user_id', otherKey: 'job_id', as: 'savedJobs' });
Job.belongsToMany(User, { through: SavedJob, foreignKey: 'job_id', otherKey: 'user_id', as: 'savedByUsers' });

// ─── User <-> Experience ──────────────────────────────────────────────────────
User.hasMany(Experience, { foreignKey: 'user_id', as: 'experience', onDelete: 'CASCADE' });
Experience.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ─── User <-> Education ───────────────────────────────────────────────────────
User.hasMany(Education, { foreignKey: 'user_id', as: 'education', onDelete: 'CASCADE' });
Education.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ─── User <-> Certification ───────────────────────────────────────────────────
User.hasMany(Certification, { foreignKey: 'user_id', as: 'certifications', onDelete: 'CASCADE' });
Certification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });


// ═══════════════════════════════════════════════════════════════════════════════
// ASSOCIATIONS — Phase 3 (Courses)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Admin (User) <-> Course ─────────────────────────────────────────────────
User.hasMany(Course, { foreignKey: 'admin_id', as: 'createdCourses', onDelete: 'CASCADE' });
Course.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

// ─── Course <-> Lesson ────────────────────────────────────────────────────────
Course.hasMany(Lesson, { foreignKey: 'course_id', as: 'lessons', onDelete: 'CASCADE' });
Lesson.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// ─── User <-> Course (M:N via Enrollments) ───────────────────────────────────
User.belongsToMany(Course, { through: Enrollment, foreignKey: 'user_id', otherKey: 'course_id', as: 'enrolledCourses' });
Course.belongsToMany(User, { through: Enrollment, foreignKey: 'course_id', otherKey: 'user_id', as: 'enrolledUsers' });
Course.hasMany(Enrollment, { foreignKey: 'course_id', as: 'enrollments', onDelete: 'CASCADE' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Enrollment.belongsTo(User,   { foreignKey: 'user_id',   as: 'user' });

// ─── User <-> Lesson (M:N via LessonProgress) ────────────────────────────────
Lesson.hasMany(LessonProgress, { foreignKey: 'lesson_id', as: 'progress', onDelete: 'CASCADE' });
LessonProgress.belongsTo(Lesson, { foreignKey: 'lesson_id', as: 'lesson' });
LessonProgress.belongsTo(User,   { foreignKey: 'user_id',   as: 'user' });


// ═══════════════════════════════════════════════════════════════════════════════
// ASSOCIATIONS — Phase 4 (Interview Agent)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── User (Seeker) <-> Interview ─────────────────────────────────────────────
User.hasMany(Interview, { foreignKey: 'seeker_id', as: 'interviews', onDelete: 'CASCADE' });
Interview.belongsTo(User, { foreignKey: 'seeker_id', as: 'seeker' });

// ─── InterviewSchedule associations ──────────────────────────────────────────
// Interview (passed) → has one Schedule
Interview.hasOne(InterviewSchedule, { foreignKey: 'interview_id', as: 'schedule', onDelete: 'CASCADE' });
InterviewSchedule.belongsTo(Interview, { foreignKey: 'interview_id', as: 'interview' });

// Seeker → has many schedules
User.hasMany(InterviewSchedule, { foreignKey: 'seeker_id', as: 'seekerSchedules', onDelete: 'CASCADE' });
InterviewSchedule.belongsTo(User, { foreignKey: 'seeker_id', as: 'seeker' });

// Recruiter → has many schedules they created
User.hasMany(InterviewSchedule, { foreignKey: 'recruiter_id', as: 'recruiterSchedules' });
InterviewSchedule.belongsTo(User, { foreignKey: 'recruiter_id', as: 'recruiter' });


// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  User,
  RefreshToken,
  Company,
  Job,
  Skill,
  Application,
  Notification,
  UserSkill,
  JobSkill,
  SavedJob,
  Experience,
  Education,
  Certification,
  // Phase 3
  Course,
  Lesson,
  Enrollment,
  LessonProgress,
  // Phase 4
  Interview,
  InterviewSchedule,
};
