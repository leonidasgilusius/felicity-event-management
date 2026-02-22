import express from 'express';
import { getParticipantDashboard } from '../../controllers/participant/dashboardController.js';

const router = express.Router();

router.get('/', getParticipantDashboard);

export default router;
