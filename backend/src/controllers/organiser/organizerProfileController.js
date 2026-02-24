import Organizer from '../../models/user/Organizer.js';
import PasswordResetRequest from '../../models/PasswordResetRequest.js';

export async function getOrganizerProfile(req, res) {
  try {
    const organizer = await Organizer.findById(req.user._id)
      .select('name email category description contactEmail contactPhone discordWebhook')
      .lean();

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found.' });
    }

    return res.status(200).json({ profile: organizer });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while fetching organizer profile.' });
  }
}

export async function updateOrganizerProfile(req, res) {
  try {
    const { name, category, description, contactEmail, contactPhone, discordWebhook } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (category !== undefined) updates.category = String(category).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (contactEmail !== undefined) updates.contactEmail = String(contactEmail).trim();
    if (contactPhone !== undefined) updates.contactPhone = String(contactPhone).trim();
    if (discordWebhook !== undefined) updates.discordWebhook = String(discordWebhook).trim();

    const organizer = await Organizer.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('name email category description contactEmail contactPhone discordWebhook');

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found.' });
    }

    return res.status(200).json({ message: 'Profile updated successfully.', profile: organizer });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while updating organizer profile.' });
  }
}

export async function createPasswordResetRequest(req, res) {
  try {
    const organizerId = req.user._id;
    const { reason } = req.body;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: 'Reason is required.' });
    }

    const pending = await PasswordResetRequest.findOne({ organizer: organizerId, status: 'Pending' }).lean();
    if (pending) {
      return res.status(400).json({ message: 'You already have a pending password reset request.' });
    }

    const request = await PasswordResetRequest.create({
      organizer: organizerId,
      reason: String(reason).trim(),
      status: 'Pending',
    });

    return res.status(201).json({
      message: 'Password reset request submitted to admin.',
      request,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while creating password reset request.' });
  }
}

export async function listOwnPasswordResetRequests(req, res) {
  try {
    const organizerId = req.user._id;
    const requests = await PasswordResetRequest.find({ organizer: organizerId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ requests });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while listing password reset requests.' });
  }
}
