import express from 'express';
import {
  listOrganizers,
  createOrganizer,
  toggleDisableOrganizer,
  archiveOrganizer,
  deleteOrganizer
} from '../controllers/adminController.js';

const router = express.Router();

router.get('/organizers', listOrganizers);
router.post('/organizers', createOrganizer);
router.patch('/organizers/:id/disable', toggleDisableOrganizer);
router.patch('/organizers/:id/archive', archiveOrganizer);
router.delete('/organizers/:id', deleteOrganizer);

export default router;
