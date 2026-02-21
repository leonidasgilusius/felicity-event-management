import express from 'express';
import { browseEvents } from '../controllers/browseEventsController.js';

const router = express.Router();

// GET /browseEvents  – full filter + search + trending
router.get('/', browseEvents);

export default router;
