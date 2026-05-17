'use strict';

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// ─── Cloudinary Configuration ────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Resume Storage (Memory Storage for AI Parsing) ───────────────────────────
// We need the file in memory so we can send it to the AI parser FIRST,
// before manually uploading it to Cloudinary.
const resumeStorage = multer.memoryStorage();

const resumeFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF or Word documents are allowed for resumes.'), false);
  }
};

// ─── Logo Storage (Images → Cloudinary /revup/logos) ────────────────────────
const logoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:         'revup/logos',
    public_id:      `logo_${Date.now()}`,
    resource_type:  'image',
    transformation: [{ width: 400, height: 400, crop: 'limit' }],
  }),
});

const logoFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, SVG) are allowed for logos.'), false);
  }
};

// ─── Profile Pic Storage (Images → Cloudinary /revup/profiles) ──────────────
const profilePicStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:         'revup/profiles',
    public_id:      `profile_${req.user.id}_${Date.now()}`,
    resource_type:  'image',
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
  }),
});

// ─── Multer instances ────────────────────────────────────────────────────────
const uploadResume = multer({
  storage:    resumeStorage,
  fileFilter: resumeFilter,
  limits:     { fileSize: 10 * 1024 * 1024 }, // 10 MB (AI parser supports up to 10MB)
});

const uploadLogo = multer({
  storage:    logoStorage,
  fileFilter: logoFilter,
  limits:     { fileSize: 2 * 1024 * 1024 },  // 2 MB
});

const uploadProfilePic = multer({
  storage:    profilePicStorage,
  fileFilter: logoFilter,
  limits:     { fileSize: 2 * 1024 * 1024 },  // 2 MB
});

module.exports = { uploadResume, uploadLogo, uploadProfilePic };
