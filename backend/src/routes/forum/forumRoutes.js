import express from 'express';
import {
  getForumMessages,
  createForumMessage,
  toggleForumReaction,
  togglePinForumMessage,
  deleteForumMessage,
} from '../../controllers/forum/forumController.js';

const router = express.Router();

router.get('/:eventId/messages', getForumMessages);
router.post('/:eventId/messages', createForumMessage);
router.patch('/messages/:messageId/reaction', toggleForumReaction);
router.patch('/messages/:messageId/pin', togglePinForumMessage);
router.delete('/messages/:messageId', deleteForumMessage);

export default router;
