'use strict';

// ─── Phase 1 & 2 Models ───────────────────────────────────────────────────────
const User            = require('./User');
const Company         = require('./Company');
const Job             = require('./Job');
const Skill           = require('./Skill');
const Application     = require('./Application');
const Notification    = require('./Notification');
const UserSkill       = require('./UserSkill');
const JobSkill        = require('./JobSkill');
const SavedJob        = require('./SavedJob');

// ─── Phase 3 — Courses Models ─────────────────────────────────────────────────
const Course          = require('./Course');
const Lesson          = require('./Lesson');
const Enrollment      = require('./Enrollment');
const LessonProgress  = require('./LessonProgress');



// ═══════════════════════════════════════════════════════════════════════════════
// ASSOCIATIONS — Phase 1 & 2
// ═══════════════════════════════════════════════════════════════════════════════

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
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  User,
  Company,
  Job,
  Skill,
  Application,
  Notification,
  UserSkill,
  JobSkill,
  SavedJob,
  // Phase 3
  Course,
  Lesson,
  Enrollment,
  LessonProgress,
};
