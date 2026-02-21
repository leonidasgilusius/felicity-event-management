import express from 'express';
import { getParticipantDashboard } from '../controllers/participantDashboardController.js';

const router = express.Router();

router.get('/', getParticipantDashboard);

export default router;
