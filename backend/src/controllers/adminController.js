import Organizer from '../models/Organizer.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';

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
    const existing = await User.find({ email: { $regex: '^club-\\d+@iiit\\.ac\\.in$' } }).select('email');

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
    const organizer = await User.findOne({ _id: id, role: 'Organizer' });
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
    const organizer = await User.findOne({ _id: id, role: 'Organizer' });
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
    const organizer = await User.findOne({ _id: id, role: 'Organizer' });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    await User.deleteOne({ _id: id });

    return res.status(200).json({ message: 'Organizer deleted permanently' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while deleting organizer.' });
  }
}
