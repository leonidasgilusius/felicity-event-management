import express from 'express';
import {
	getEventDetail,
	registerForEvent,
	orderMerchandise,
	unregisterFromEvent,
	uploadPaymentProof,
	submitEventFeedback,
} from '../../controllers/participant/eventDetailsController.js';

const router = express.Router();

router.get('/:id', getEventDetail);
router.post('/:id/register', registerForEvent);
router.post('/:id/order', orderMerchandise);
router.put('/:id/payment-proof', uploadPaymentProof);
router.post('/:id/feedback', submitEventFeedback);
router.delete('/:id/unregister', unregisterFromEvent);

export default router;
