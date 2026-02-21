import express from 'express';
import { listOrganizers, getOrganizerDetail, toggleFollowOrganizer } from '../controllers/participantOrganizerController.js';

const router = express.Router();

router.get('/', listOrganizers);
router.get('/:id', getOrganizerDetail);
router.post('/:id/follow', toggleFollowOrganizer);

export default router;
