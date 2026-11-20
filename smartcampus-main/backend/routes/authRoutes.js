import express from 'express';
import { register, login, getUsers, createClubAdmin, createHead } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route: POST /api/auth/register
router.post('/register', register);
router.post('/club-admin', protect, authorize('SUPER_ADMIN'), createClubAdmin);
router.post('/head', protect, authorize('SUPER_ADMIN'), createHead);

// Route: POST /api/auth/login
router.post('/login', login);

// Route: GET /api/auth/users
router.get('/users', protect, getUsers);

export default router;
