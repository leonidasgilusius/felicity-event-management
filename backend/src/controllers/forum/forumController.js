import Event from '../../models/event/Event.js';
import User from '../../models/user/User.js';
import { Registration } from '../../models/Registration.js';
import ForumMessage from '../../models/ForumMessage.js';

function roleOf(req) {
  return String(req.user?.role || '').toLowerCase();
}

async function isOrganizerOfEvent(userId, eventId) {
  const event = await Event.findOne({ _id: eventId, organizer: userId }).lean();
  return !!event;
}

async function isRegisteredParticipant(userId, eventId) {
  const existing = await Registration.exists({
    event: eventId,
    user: userId,
    status: { $ne: 'cancelled' },
  });
  return !!existing;
}

function formatMessage(message, currentUserId) {
  const reactedByMe = new Set();
  const reactions = (message.reactions || []).map((reaction) => {
    const users = reaction.users || [];
    const hasMe = users.some((userId) => String(userId) === String(currentUserId));
    if (hasMe) reactedByMe.add(reaction.emoji);
    return {
      emoji: reaction.emoji,
      count: users.length,
      reactedByMe: hasMe,
    };
  });

  return {
    _id: message._id,
    parentMessage: message.parentMessage || null,
    content: message.isDeleted ? '[Message removed by organizer]' : message.content,
    rawContent: message.content,
    isDeleted: message.isDeleted,
    isAnnouncement: message.isAnnouncement,
    isPinned: message.isPinned,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    author: {
      _id: message.author?._id || null,
      name: message.author?.name || 'Unknown',
      role: message.author?.role || 'User',
    },
    reactions,
    reactedByMe: Array.from(reactedByMe),
  };
}

function toThread(messages) {
  const map = new Map();
  messages.forEach((message) => map.set(String(message._id), { ...message, replies: [] }));

  const roots = [];
  messages.forEach((message) => {
    const key = String(message._id);
    const node = map.get(key);
    if (message.parentMessage && map.has(String(message.parentMessage))) {
      map.get(String(message.parentMessage)).replies.push(node);
    } else {
      roots.push(node);
    }
  });

  roots.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  roots.forEach((root) => {
    root.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  });

  return roots;
}

export async function getForumMessages(req, res) {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const messages = await ForumMessage.find({ event: eventId })
      .populate('author', 'name role')
      .sort({ createdAt: 1 })
      .lean();

    const formatted = messages.map((message) => formatMessage(message, req.user._id));
    const threaded = toThread(formatted);

    return res.status(200).json({ messages: threaded });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while loading forum messages.' });
  }
}

export async function createForumMessage(req, res) {
  try {
    const { eventId } = req.params;
    const { content, parentMessageId = null, isAnnouncement = false } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    const event = await Event.findById(eventId).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const role = roleOf(req);
    const isOrganizer = role === 'organizer' && (await isOrganizerOfEvent(req.user._id, eventId));
    const isParticipant = role === 'participant' && (await isRegisteredParticipant(req.user._id, eventId));

    if (!isOrganizer && !isParticipant) {
      return res.status(403).json({ message: 'Only the organizer or registered participants can post in this forum.' });
    }

    if (parentMessageId) {
      const parent = await ForumMessage.findOne({ _id: parentMessageId, event: eventId }).lean();
      if (!parent) return res.status(404).json({ message: 'Parent message not found.' });
    }

    const message = await ForumMessage.create({
      event: eventId,
      author: req.user._id,
      parentMessage: parentMessageId || null,
      content: String(content).trim(),
      isAnnouncement: Boolean(isAnnouncement) && isOrganizer,
    });

    const populated = await ForumMessage.findById(message._id)
      .populate('author', 'name role')
      .lean();

    return res.status(201).json({ message: formatMessage(populated, req.user._id) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while posting forum message.' });
  }
}

export async function toggleForumReaction(req, res) {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ message: 'Emoji is required.' });
    }

    const message = await ForumMessage.findById(messageId).populate('author', 'name role');
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    const role = roleOf(req);
    const isOrganizer = role === 'organizer' && (await isOrganizerOfEvent(req.user._id, message.event));
    const isParticipant = role === 'participant' && (await isRegisteredParticipant(req.user._id, message.event));

    if (!isOrganizer && !isParticipant) {
      return res.status(403).json({ message: 'Only the organizer or registered participants can react.' });
    }

    let reaction = message.reactions.find((entry) => entry.emoji === emoji);
    if (!reaction) {
      message.reactions.push({ emoji, users: [req.user._id] });
    } else {
      const already = reaction.users.some((userId) => String(userId) === String(req.user._id));
      if (already) {
        reaction.users = reaction.users.filter((userId) => String(userId) !== String(req.user._id));
      } else {
        reaction.users.push(req.user._id);
      }

      if (reaction.users.length === 0) {
        message.reactions = message.reactions.filter((entry) => entry.emoji !== emoji);
      }
    }

    await message.save();

    const updated = await ForumMessage.findById(messageId).populate('author', 'name role').lean();
    return res.status(200).json({ message: formatMessage(updated, req.user._id) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while reacting to forum message.' });
  }
}

export async function togglePinForumMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { isPinned } = req.body;

    const message = await ForumMessage.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    const canModerate = await isOrganizerOfEvent(req.user._id, message.event);
    if (!canModerate) return res.status(403).json({ message: 'Only event organizer can pin messages.' });

    message.isPinned = Boolean(isPinned);
    await message.save();

    return res.status(200).json({ message: 'Pin status updated.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while pinning forum message.' });
  }
}

export async function deleteForumMessage(req, res) {
  try {
    const { messageId } = req.params;
    const message = await ForumMessage.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    const canModerate = await isOrganizerOfEvent(req.user._id, message.event);
    if (!canModerate) return res.status(403).json({ message: 'Only event organizer can delete messages.' });

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = '[deleted]';
    await message.save();

    return res.status(200).json({ message: 'Forum message deleted.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while deleting forum message.' });
  }
}
