import Event from '../../../models/event/Event.js';
import { Registration } from '../../../models/Registration.js';
import EventFeedback from '../../../models/EventFeedback.js';
import { getDisplayStatus, getEventAnalytics } from './utils.js';

export async function getOrganizerEventDetail(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId }).lean();
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }

    const registrations = await Registration.find({ event: eventId })
      .populate('user', 'name email')
      .lean();

    const analytics = getEventAnalytics(event, registrations);

    const participants = registrations.map((reg) => ({
      _id: reg._id,
      name: reg.user?.name || 'Unknown',
      email: reg.user?.email || '',
      registeredAt: reg.createdAt,
      paymentStatus: reg.paymentStatus || null,
      status: reg.status,
      ticketId: reg.ticketId,
      quantity: reg.quantity || null,
      totalPrice: reg.totalPrice ?? null,
    }));

    return res.status(200).json({
      event,
      analytics,
      participants,
      displayStatus: getDisplayStatus(event)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while fetching event detail.' });
  }
}

export async function getEventFeedbackOverview(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;
    const ratingFilter = req.query.rating ? Number(req.query.rating) : null;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId }).lean();
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }

    const query = { event: eventId };
    if (ratingFilter && Number.isInteger(ratingFilter) && ratingFilter >= 1 && ratingFilter <= 5) {
      query.rating = ratingFilter;
    }

    const feedbackList = await EventFeedback.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const allFeedback = await EventFeedback.find({ event: eventId }).select('rating').lean();
    const total = allFeedback.length;
    const averageRating = total > 0
      ? Number((allFeedback.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(2))
      : 0;

    const ratingBreakdown = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: allFeedback.filter((item) => item.rating === rating).length,
    }));

    return res.status(200).json({
      stats: {
        total,
        averageRating,
        ratingBreakdown,
      },
      feedback: feedbackList.map((item) => ({
        _id: item._id,
        rating: item.rating,
        comment: item.comment,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while fetching event feedback.' });
  }
}