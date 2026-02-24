import Organizer from '../../models/user/Organizer.js';
import PasswordResetRequest from '../../models/PasswordResetRequest.js';
import Event from '../../models/event/Event.js';
import Registration from '../../models/Registration.js';
import ForumMessage from '../../models/ForumMessage.js';
import EventFeedback from '../../models/EventFeedback.js';
import AttendanceAudit from '../../models/AttendanceAudit.js';

function generateRandomPassword(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function listOrganizers(req, res) {
  try {
    const organizers = await Organizer.find().select('name email isDisabled archived createdAt updatedAt').lean();
    return res.status(200).json({ organizers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while listing organizers.' });
  }
}

export async function createOrganizer(req, res) {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required to create organizer.' });
    }

    const regex = /^club-(\d+)@iiit\.ac\.in$/i;
    const existing = await Organizer.find({ email: { $regex: '^club-\\d+@iiit\\.ac\\.in$' } }).select('email');

    let maxIndex = 0;
    for (const u of existing) {
      const m = u.email.match(regex);
      if (m) {
        const idx = parseInt(m[1], 10);
        if (idx > maxIndex) maxIndex = idx;
      }
    }

    const nextIndex = maxIndex + 1;
    const email = `club-${nextIndex}@iiit.ac.in`;
    const password = generateRandomPassword(12);

    const organizer = await Organizer.create({ name, email, password });

    return res.status(201).json({
      message: 'Organizer created',
      organizer: {
        _id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        createdAt: organizer.createdAt
      },
      password
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while creating organizer.' });
  }
}

export async function toggleDisableOrganizer(req, res) {
  try {
    const { id } = req.params;
    const organizer = await Organizer.findById(id);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    organizer.isDisabled = !organizer.isDisabled;
    await organizer.save();

    return res.status(200).json({ message: 'Organizer updated', isDisabled: organizer.isDisabled });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while updating organizer.' });
  }
}

export async function archiveOrganizer(req, res) {
  try {
    const { id } = req.params;
    const organizer = await Organizer.findById(id);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    organizer.archived = true;
    await organizer.save();

    return res.status(200).json({ message: 'Organizer archived' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while archiving organizer.' });
  }
}

export async function deleteOrganizer(req, res) {
  try {
    const { id } = req.params;
    const organizer = await Organizer.findById(id);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const organizerEvents = await Event.find({ organizer: id }).select('_id').lean();
    const eventIds = organizerEvents.map((event) => event._id);

    if (eventIds.length > 0) {
      await Promise.all([
        AttendanceAudit.deleteMany({ event: { $in: eventIds } }),
        EventFeedback.deleteMany({ event: { $in: eventIds } }),
        ForumMessage.deleteMany({ event: { $in: eventIds } }),
        Registration.deleteMany({ event: { $in: eventIds } }),
      ]);

      await Event.deleteMany({ _id: { $in: eventIds } });
    }

    await Organizer.deleteOne({ _id: id });

    return res.status(200).json({
      message: 'Organizer deleted permanently',
      deletedEvents: eventIds.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while deleting organizer.' });
  }
}

export async function listPasswordResetRequests(req, res) {
  try {
    const requests = await PasswordResetRequest.find()
      .populate('organizer', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ requests });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while listing password reset requests.' });
  }
}

export async function approvePasswordResetRequest(req, res) {
  try {
    const { id } = req.params;
    const { comment = '' } = req.body;

    const request = await PasswordResetRequest.findById(id).populate('organizer');
    if (!request) return res.status(404).json({ message: 'Password reset request not found.' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ message: `Request is already ${request.status}.` });
    }

    const organizer = await Organizer.findById(request.organizer._id);
    if (!organizer) {
      return res.status(404).json({ message: 'Organizer account not found.' });
    }

    const newPassword = generateRandomPassword(12);
    organizer.password = newPassword;
    await organizer.save();

    request.status = 'Approved';
    request.adminComment = String(comment || '').trim();
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    return res.status(200).json({
      message: 'Password reset approved.',
      request,
      generatedPassword: newPassword,
      organizer: {
        name: organizer.name,
        email: organizer.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while approving password reset request.' });
  }
}

export async function rejectPasswordResetRequest(req, res) {
  try {
    const { id } = req.params;
    const { comment = '' } = req.body;

    const request = await PasswordResetRequest.findById(id);
    if (!request) return res.status(404).json({ message: 'Password reset request not found.' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ message: `Request is already ${request.status}.` });
    }

    request.status = 'Rejected';
    request.adminComment = String(comment || '').trim();
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    return res.status(200).json({ message: 'Password reset request rejected.', request });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while rejecting password reset request.' });
  }
}
