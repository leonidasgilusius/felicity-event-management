import express from 'express';
import { getOrganizerProfile, updateOrganizerProfile } from '../../controllers/organiser/organizerProfileController.js';

const router = express.Router();

router.get('/', getOrganizerProfile);
router.put('/', updateOrganizerProfile);

export default router;
