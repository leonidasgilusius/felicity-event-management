import express from 'express';
import {
	getOrganizerProfile,
	updateOrganizerProfile,
	createPasswordResetRequest,
	listOwnPasswordResetRequests,
} from '../../controllers/organiser/organizerProfileController.js';

const router = express.Router();

router.get('/', getOrganizerProfile);
router.put('/', updateOrganizerProfile);
router.post('/password-reset-request', createPasswordResetRequest);
router.get('/password-reset-requests', listOwnPasswordResetRequests);

export default router;
