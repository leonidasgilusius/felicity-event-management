import express from 'express';
import {
  createDraftEvent,
  getOrganizerDashboard,
  publishEvent,
  updateEventFormSchema,
  getOrganizerEventDetail,
  updateOrganizerEvent,
  changeEventStatus,
  getAttendanceOverview,
  scanAttendanceTicket,
  manualMarkAttendance,
  getEventFeedbackOverview,
  getEventOrders,
  getOrderProof,
  approveOrder,
  rejectOrder,
} from '../../controllers/organiser/organizerEventsController.js';

const router = express.Router();

router.get('/dashboard', getOrganizerDashboard);
router.post('/draft', createDraftEvent);
// Order management (before /:eventId to avoid conflict)
router.get('/orders/:orderId/proof', getOrderProof);
router.patch('/orders/:orderId/approve', approveOrder);
router.patch('/orders/:orderId/reject', rejectOrder);
router.get('/:eventId/attendance', getAttendanceOverview);
router.post('/:eventId/attendance/scan', scanAttendanceTicket);
router.post('/:eventId/attendance/manual', manualMarkAttendance);
router.get('/:eventId/feedback', getEventFeedbackOverview);
router.get('/:eventId', getOrganizerEventDetail);
router.patch('/:eventId/form-schema', updateEventFormSchema);
router.patch('/:eventId/publish', publishEvent);
router.patch('/:eventId/edit', updateOrganizerEvent);
router.patch('/:eventId/status', changeEventStatus);
router.get('/:eventId/orders', getEventOrders);

export default router;
