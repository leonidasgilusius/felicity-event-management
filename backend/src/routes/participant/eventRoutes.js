import express from 'express';
import { getEventDetail, registerForEvent, orderMerchandise, unregisterFromEvent } from '../../controllers/participant/eventDetailsController.js';

const router = express.Router();

router.get('/:id', getEventDetail);
router.post('/:id/register', registerForEvent);
router.post('/:id/order', orderMerchandise);
router.delete('/:id/unregister', unregisterFromEvent);

export default router;
