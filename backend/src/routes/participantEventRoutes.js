import express from 'express';
import { getEventDetail, registerForEvent, orderMerchandise } from '../controllers/participantEventController.js';

const router = express.Router();

router.get('/:id', getEventDetail);
router.post('/:id/register', registerForEvent);
router.post('/:id/order', orderMerchandise);

export default router;
