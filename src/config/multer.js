'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Ensure upload directories exist ────────────────────────────────────────
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};
ensureDir(path.join(__dirname, '../../uploads/resumes'));
ensureDir(path.join(__dirname, '../../uploads/logos'));

// ─── Resume Storage (PDF only, max 5MB) ─────────────────────────────────────
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/resumes'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `resume_${req.user.id}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const resumeFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for resumes.'), false);
  }
};

// ─── Logo Storage (Images only, max 2MB) ────────────────────────────────────
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/logos'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `logo_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const logoFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, SVG) are allowed for logos.'), false);
  }
};

const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: logoFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// ─── Profile Pic Storage (Images only, max 2MB) ─────────────────────────────
ensureDir(path.join(__dirname, '../../uploads/profiles'));

const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/profiles'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `profile_${req.user.id}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const uploadProfilePic = multer({
  storage: profilePicStorage,
  fileFilter: logoFilter, // reuse logo filter
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = { uploadResume, uploadLogo, uploadProfilePic };
