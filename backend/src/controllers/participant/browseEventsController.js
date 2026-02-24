import Event from '../../models/event/Event.js';
import Registration from '../../models/Registration.js';
import Participant from '../../models/user/Participant.js';
import Organizer from '../../models/user/Organizer.js';

function normalizeEligibilityValue(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'ALL') return 'All';
  if (normalized === 'IIIT') return 'IIIT';
  return null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getRuntimeEventStatus(event) {
  const now = Date.now();
  const startMs = new Date(event.startDate).getTime();
  const endMs = new Date(event.endDate).getTime();

  if (event.status === 'draft') return 'draft';
  if (event.status === 'closed') return 'closed';
  if (event.status === 'completed') return 'completed';
  if (Number.isFinite(endMs) && now > endMs) return 'completed';
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && now >= startMs && now <= endMs) {
    return 'ongoing';
  }
  return 'published';
}


export const browseEvents = async (req, res) => {
  try {
    const { search, type, eligibility, startDate, endDate, filter } = req.query;
    const userId = req.user._id;
    const participant = await Participant.findById(userId)
      .select('isIIIT followedOrganizers interests')
      .lean();

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found.' });
    }

    const query = {
      status: { $in: ['published', 'ongoing', 'closed', 'completed'] },
      endDate: { $gte: new Date() },
    };

    if (!participant.isIIIT) {
      query.eligibility = 'All';
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (eligibility && eligibility !== 'all') {
      const normalizedEligibility = normalizeEligibilityValue(eligibility);
      if (!normalizedEligibility) {
        return res.status(400).json({ message: 'Invalid eligibility filter. Use All or IIIT.' });
      }

      if (!participant.isIIIT && normalizedEligibility === 'IIIT') {
        return res.json({ events: [], trending: [] });
      }

      query.eligibility = normalizedEligibility;
    }

    if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    }
    if (endDate) {
      query.endDate = { $lte: new Date(endDate) };
    }

    if (filter === 'followed' || filter === 'interests') {
      if (filter === 'followed') {
        const followed = participant?.followedOrganizers ?? [];
        if (followed.length === 0) {
          return res.json({ events: [], trending: [] });
        }
        query.organizer = { $in: followed };
      }

      if (filter === 'interests') {
        const interests = Array.isArray(participant?.interests)
          ? participant.interests.map((interest) => String(interest).trim()).filter(Boolean)
          : [];

        if (interests.length === 0) {
          return res.json({ events: [], trending: [] });
        }

        const interestRegexes = interests.map(
          (interest) => new RegExp(`^${escapeRegex(interest)}$`, 'i')
        );
        query.eventTags = { $in: interestRegexes };
      }
    }

    if (filter === 'open') {
      query.status = { $in: ['published', 'ongoing'] };
    }

    if (search && search.trim() !== '') {
      const safeSearch = escapeRegex(search.trim());
      const matchingOrganizers = await Organizer.find({
        name: { $regex: safeSearch, $options: 'i' },
      }).select('_id');
      const organizerIds = matchingOrganizers.map((o) => o._id);

      const searchClause = [
        { title: { $regex: safeSearch, $options: 'i' } },
        ...(organizerIds.length ? [{ organizer: { $in: organizerIds } }] : []),
      ];

      query.$or = searchClause;
    }

    const events = await Event.find(query)
      .populate('organizer', 'name category')
      .sort({ createdAt: -1 })
      .lean();

    const eventsWithRuntimeStatus = events.map((event) => ({
      ...event,
      status: getRuntimeEventStatus(event),
    }));

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trendingAgg = await Registration.aggregate([
      { $match: { createdAt: { $gte: oneDayAgo } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const trendingEventIds = trendingAgg.map((t) => t._id);

    const trendingFilter = { _id: { $in: trendingEventIds } };
    if (!participant.isIIIT) {
      trendingFilter.eligibility = 'All';
    }

    const trendingDocs = await Event.find(trendingFilter)
      .populate('organizer', 'name category')
      .lean();

    const trendingEvents = trendingAgg
      .map((t) => {
        const doc = trendingDocs.find(
          (e) => e._id.toString() === t._id.toString()
        );
        return doc
          ? { ...doc, status: getRuntimeEventStatus(doc), trendingCount: t.count }
          : null;
      })
      .filter(Boolean);

    return res.json({ events: eventsWithRuntimeStatus, trending: trendingEvents });
  } catch (err) {
    console.error('[browseEvents]', err);
    return res.status(500).json({ message: 'Server error while browsing events.' });
  }
};
