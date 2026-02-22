import express from 'express';
import {
  createDraftEvent,
  getOrganizerDashboard,
  publishEvent,
  updateEventFormSchema,
  getOrganizerEventDetail,
  updateOrganizerEvent,
  changeEventStatus
} from '../../controllers/organiser/organizerEventsController.js';

const router = express.Router();

router.get('/dashboard', getOrganizerDashboard);
router.post('/draft', createDraftEvent);
router.get('/:eventId', getOrganizerEventDetail);
router.patch('/:eventId/form-schema', updateEventFormSchema);
router.patch('/:eventId/publish', publishEvent);
router.patch('/:eventId/edit', updateOrganizerEvent);
router.patch('/:eventId/status', changeEventStatus);

export default router;
