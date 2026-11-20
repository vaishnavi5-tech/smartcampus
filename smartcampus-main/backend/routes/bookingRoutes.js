import express from 'express';
import {
  getAuditoriums,
  createBooking,
  updateBookingStatus,
  getAllBookings,
  downloadApprovalLetter
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/auditoriums').get(getAuditoriums);

router.route('/')
  .get(protect, authorize('SUPER_ADMIN', 'HEAD'), getAllBookings)
  .post(protect, createBooking);

router.route('/:id/status')
  .put(protect, authorize('HEAD'), updateBookingStatus);

router.get('/:id/approval-letter', protect, downloadApprovalLetter);

export default router;
