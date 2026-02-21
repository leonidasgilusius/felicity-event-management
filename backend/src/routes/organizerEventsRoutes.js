import express from 'express';
import {
  createDraftEvent,
  getOrganizerDashboard,
  publishEvent,
  updateEventFormSchema
} from '../controllers/organizerEventsController.js';

const router = express.Router();

router.get('/dashboard', getOrganizerDashboard);
router.post('/draft', createDraftEvent);
router.patch('/:eventId/form-schema', updateEventFormSchema);
router.patch('/:eventId/publish', publishEvent);

export default router;
