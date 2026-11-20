import express from 'express';
import {
  getClubs,
  getClubsAvailableForAdmin,
  getManagedClub,
  getCoordinatedClubs,
  getClubById,
  createClub,
  assignClubFaculty,
  removeClubFaculty,
  updateClub,
  joinClub,
  getPendingRequests,
  approveRequest
} from '../controllers/clubController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getClubs)
  .post(protect, authorize('SUPER_ADMIN', 'FACULTY'), createClub);

router.get('/available-for-admin', getClubsAvailableForAdmin);
router.get('/managed', protect, authorize('CLUB_ADMIN'), getManagedClub);
router.get('/coordinated', protect, authorize('FACULTY'), getCoordinatedClubs);
router.post('/:id/faculty-assignments', protect, authorize('SUPER_ADMIN'), assignClubFaculty);
router.delete('/:id/faculty-assignments/:facultyId', protect, authorize('SUPER_ADMIN'), removeClubFaculty);

router.route('/:id')
  .get(getClubById)
  .put(protect, authorize('SUPER_ADMIN', 'CLUB_ADMIN', 'FACULTY'), updateClub);

router.route('/:id/join')
  .post(protect, joinClub);

router.route('/requests/pending')
  .get(protect, authorize('SUPER_ADMIN', 'FACULTY', 'CLUB_ADMIN'), getPendingRequests);

router.route('/requests/:requestId')
  .put(protect, authorize('SUPER_ADMIN', 'FACULTY', 'CLUB_ADMIN'), approveRequest);

export default router;
