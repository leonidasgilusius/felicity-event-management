import User from '../../models/user/User.js';
import Participant from '../../models/user/Participant.js';
import Event from '../../models/event/Event.js';

// ── GET /participantOrganizers ────────────────────────────────────────────────
export const listOrganizers = async (req, res) => {
  try {
    const organizers = await User.find({ role: 'Organizer', isDisabled: false, archived: false })
      .select('name email category description')
      .lean();

    // Attach whether the participant follows each one
    const participant = await Participant.findById(req.user._id).select('followedOrganizers').lean();
    const followedSet = new Set((participant?.followedOrganizers || []).map(String));

    const result = organizers.map((o) => ({
      ...o,
      isFollowed: followedSet.has(String(o._id)),
    }));

    return res.json({ organizers: result });
  } catch (err) {
    console.error('[listOrganizers]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ── GET /participantOrganizers/:id ────────────────────────────────────────────
export const getOrganizerDetail = async (req, res) => {
  try {
    const organizer = await User.findOne({ _id: req.params.id, role: 'Organizer' })
      .select('name email category description')
      .lean();

    if (!organizer) return res.status(404).json({ message: 'Organizer not found.' });

    const now = new Date();
    const upcoming = await Event.find({ organizer: organizer._id, startDate: { $gte: now }, status: { $in: ['published', 'ongoing'] } })
      .select('title startDate endDate status type')
      .sort({ startDate: 1 })
      .lean();

    const past = await Event.find({ organizer: organizer._id, endDate: { $lt: now } })
      .select('title startDate endDate status type')
      .sort({ endDate: -1 })
      .limit(10)
      .lean();

    const participant = await Participant.findById(req.user._id).select('followedOrganizers').lean();
    const isFollowed = (participant?.followedOrganizers || []).map(String).includes(String(organizer._id));

    return res.json({ organizer: { ...organizer, isFollowed }, upcoming, past });
  } catch (err) {
    console.error('[getOrganizerDetail]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ── POST /participantOrganizers/:id/follow  (toggles) ─────────────────────────
export const toggleFollowOrganizer = async (req, res) => {
  try {
    const participant = await Participant.findById(req.user._id).select('followedOrganizers');
    if (!participant) return res.status(404).json({ message: 'Participant not found.' });

    const orgId = req.params.id;
    const alreadyFollowing = participant.followedOrganizers.map(String).includes(orgId);

    if (alreadyFollowing) {
      participant.followedOrganizers = participant.followedOrganizers.filter((id) => String(id) !== orgId);
    } else {
      participant.followedOrganizers.push(orgId);
    }

    await participant.save();
    return res.json({ isFollowed: !alreadyFollowing });
  } catch (err) {
    console.error('[toggleFollowOrganizer]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
