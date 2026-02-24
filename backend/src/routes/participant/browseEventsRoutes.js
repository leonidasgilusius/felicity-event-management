import express from 'express';
import { browseEvents } from '../../controllers/participant/browseEventsController.js';

const router = express.Router();

router.get('/', browseEvents);

export default router;
