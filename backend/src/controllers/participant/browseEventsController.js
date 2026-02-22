import Event from '../../models/event/Event.js';
import Registration from '../../models/Registration.js';
import Participant from '../../models/user/Participant.js';
import User from '../../models/user/User.js';

/**
 * GET /browseEvents
 * Query params:
 *   search      - partial / organizer-name match (fuzzy handled on client)
 *   type        - event type discriminator (e.g. 'normal', 'merchandise')
 *   eligibility - eligibility string, case-insensitive
 *   startDate   - ISO date (events whose startDate >= this)
 *   endDate     - ISO date (events whose endDate <= this)
 *   filter      - 'followed' | 'all' (default: 'all')
 */
export const browseEvents = async (req, res) => {
  try {
    const { search, type, eligibility, startDate, endDate, filter } = req.query;
    const userId = req.user._id;

    // Base query: all events that haven't ended yet, and are at least published
    const query = {
      status: { $in: ['published', 'ongoing', 'closed'] },
      endDate: { $gte: new Date() },
    };

    // ── Type filter ────────────────────────────────────────────────────────────
    if (type && type !== 'all') {
      query.type = type;
    }

    // ── Eligibility filter ─────────────────────────────────────────────────────
    if (eligibility && eligibility !== 'all') {
      query.eligibility = { $regex: `^${eligibility}$`, $options: 'i' };
    }

    // ── Date range filter ──────────────────────────────────────────────────────
    if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    }
    if (endDate) {
      // Narrow endDate filter if already set from base query
      query.endDate = { $lte: new Date(endDate) };
    }

    // ── Followed clubs filter ──────────────────────────────────────────────────
    if (filter === 'followed') {
      const participant = await Participant.findById(userId).select(
        'followedOrganizers'
      );
      const followed = participant?.followedOrganizers ?? [];
      if (followed.length === 0) {
        return res.json({ events: [], trending: [] });
      }
      query.organizer = { $in: followed };
    }

    // ── Search filter ──────────────────────────────────────────────────────────
    // Partial match on title, and also include events whose organizer name matches
    if (search && search.trim() !== '') {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingOrganizers = await User.find({
        name: { $regex: safeSearch, $options: 'i' },
        role: 'Organizer',
      }).select('_id');
      const organizerIds = matchingOrganizers.map((o) => o._id);

      const searchClause = [
        { title: { $regex: safeSearch, $options: 'i' } },
        ...(organizerIds.length ? [{ organizer: { $in: organizerIds } }] : []),
      ];

      // Merge with any existing $or (e.g. future expansions)
      query.$or = searchClause;
    }

    // ── Fetch events ───────────────────────────────────────────────────────────
    const events = await Event.find(query)
      .populate('organizer', 'name category')
      .sort({ startDate: 1 })
      .lean();

    // ── Trending: top-5 freshest registrations (last 24 h) ────────────────────
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trendingAgg = await Registration.aggregate([
      { $match: { createdAt: { $gte: oneDayAgo } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const trendingEventIds = trendingAgg.map((t) => t._id);

    const trendingDocs = await Event.find({ _id: { $in: trendingEventIds } })
      .populate('organizer', 'name category')
      .lean();

    // Re-order by trending count and attach the count
    const trendingEvents = trendingAgg
      .map((t) => {
        const doc = trendingDocs.find(
          (e) => e._id.toString() === t._id.toString()
        );
        return doc ? { ...doc, trendingCount: t.count } : null;
      })
      .filter(Boolean);

    return res.json({ events, trending: trendingEvents });
  } catch (err) {
    console.error('[browseEvents]', err);
    return res.status(500).json({ message: 'Server error while browsing events.' });
  }
};
