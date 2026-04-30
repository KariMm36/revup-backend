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



// ═══════════════════════════════════════════════════════════════════════════════
// ASSOCIATIONS — Phase 1 & 2
// ═══════════════════════════════════════════════════════════════════════════════

// ─── User <-> Company ────────────────────────────────────────────────────────
User.hasOne(Company, { foreignKey: 'recruiter_id', as: 'company', onDelete: 'CASCADE' });
Company.belongsTo(User, { foreignKey: 'recruiter_id', as: 'recruiter' });

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
};
