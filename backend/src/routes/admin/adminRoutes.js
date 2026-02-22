import express from 'express';
import {
  listOrganizers,
  createOrganizer,
  toggleDisableOrganizer,
  archiveOrganizer,
  deleteOrganizer,
  listPasswordResetRequests,
  approvePasswordResetRequest,
  rejectPasswordResetRequest,
} from '../../controllers/admin/adminController.js';

const router = express.Router();

router.get('/organizers', listOrganizers);
router.post('/organizers', createOrganizer);
router.patch('/organizers/:id/disable', toggleDisableOrganizer);
router.patch('/organizers/:id/archive', archiveOrganizer);
router.delete('/organizers/:id', deleteOrganizer);
router.get('/password-reset-requests', listPasswordResetRequests);
router.patch('/password-reset-requests/:id/approve', approvePasswordResetRequest);
router.patch('/password-reset-requests/:id/reject', rejectPasswordResetRequest);

export default router;
