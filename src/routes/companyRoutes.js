'use strict';

const express = require('express');
const router = express.Router();

const companyController = require('../controllers/companyController');
const { protect, authorize } = require('../middlewares/auth');
const { uploadLogo } = require('../config/multer');

/**
 * @openapi
 * tags:
 *   name: Companies
 *   description: Company Management (Recruiter Only)
 */

/**
 * @openapi
 * /api/companies/my-company:
 *   get:
 *     tags: [Companies]
 *     summary: Get recruiter's company profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Company profile }
 *       404: { description: No company created yet }
 */
router.get('/my-company', protect, authorize('recruiter'), companyController.getMyCompany);

/**
 * @openapi
 * /api/companies/stats:
 *   get:
 *     tags: [Companies]
 *     summary: Company statistics (total jobs, applications)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Company stats }
 */
router.get('/stats', protect, authorize('recruiter'), companyController.getCompanyStats);

/**
 * @openapi
 * /api/companies:
 *   post:
 *     tags: [Companies]
 *     summary: Create company profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:        { type: string }
 *               website:     { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Company created }
 *       409: { description: Company already exists }
 *   put:
 *     tags: [Companies]
 *     summary: Update company (supports logo upload)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:        { type: string }
 *               website:     { type: string }
 *               description: { type: string }
 *               logo:        { type: string, format: binary }
 *     responses:
 *       200: { description: Company updated }
 */
router.post('/', protect, authorize('recruiter'), companyController.createCompany);
router.put('/',  protect, authorize('recruiter'), uploadLogo.single('logo'), companyController.updateCompany);

/**
 * @openapi
 * /api/companies:
 *   get:
 *     tags: [Companies]
 *     summary: Get all companies
 *     responses:
 *       200: { description: List of companies }
 */
router.get('/', companyController.getAllCompanies);

/**
 * @openapi
 * /api/companies/{id}:
 *   get:
 *     tags: [Companies]
 *     summary: Get company by ID with its open jobs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Company profile }
 */
router.get('/:id', companyController.getCompanyById);

/**
 * @openapi
 * /api/companies/recruiters:
 *   get:
 *     tags: [Companies]
 *     summary: List all recruiters in the requester's company
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of recruiters }
 */
router.get('/recruiters', protect, authorize('recruiter'), companyController.getCompanyRecruiters);

/**
 * @openapi
 * /api/companies/assign-recruiter:
 *   post:
 *     tags: [Companies]
 *     summary: Company owner assigns a recruiter to their company by email
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200: { description: Recruiter assigned }
 *       404: { description: Recruiter not found }
 *       409: { description: Already assigned }
 */
router.post('/assign-recruiter', protect, authorize('recruiter'), companyController.assignRecruiter);

/**
 * @openapi
 * /api/companies/remove-recruiter/{recruiterId}:
 *   delete:
 *     tags: [Companies]
 *     summary: Company owner removes a recruiter from their company
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recruiterId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Recruiter removed }
 *       403: { description: Not the company owner }
 */
router.delete('/remove-recruiter/:recruiterId', protect, authorize('recruiter'), companyController.removeRecruiter);

module.exports = router;
