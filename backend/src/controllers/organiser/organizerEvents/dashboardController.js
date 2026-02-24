import Event from '../../../models/event/Event.js';
import { Registration } from '../../../models/Registration.js';
import { getDisplayStatus, getEventAnalytics } from './utils.js';

export async function getOrganizerDashboard(req, res) {
  try {
    const organizerId = req.user._id;

    const events = await Event.find({ organizer: organizerId })
      .sort({ createdAt: -1 })
      .lean();

    const eventIds = events.map((event) => event._id);
    const registrations = await Registration.find({ event: { $in: eventIds } }).lean();

    const registrationsByEvent = new Map();
    eventIds.forEach((eventId) => {
      registrationsByEvent.set(String(eventId), []);
    });

    registrations.forEach((registration) => {
      const key = String(registration.event);
      if (!registrationsByEvent.has(key)) {
        registrationsByEvent.set(key, []);
      }
      registrationsByEvent.get(key).push(registration);
    });

    const eventsWithAnalytics = events.map((event) => {
      const eventRegistrations = registrationsByEvent.get(String(event._id)) || [];
      const analytics = getEventAnalytics(event, eventRegistrations);
      const displayStatus = getDisplayStatus(event);

      return {
        _id: event._id,
        name: event.title,
        type: event.type,
        workflowStatus: event.status,
        status: displayStatus,
        analytics,
        startDate: event.startDate,
        endDate: event.endDate
      };
    });

    const completedEvents = eventsWithAnalytics.filter(
      (event) => event.workflowStatus === 'completed' || event.workflowStatus === 'closed'
    );
    const totalEventAnalytics = completedEvents.reduce(
      (accumulator, event) => ({
        registrations: accumulator.registrations + event.analytics.registrations,
        sales: accumulator.sales + event.analytics.sales,
        revenue: accumulator.revenue + event.analytics.revenue,
        attendance: accumulator.attendance + event.analytics.attendance
      }),
      { registrations: 0, sales: 0, revenue: 0, attendance: 0 }
    );

    const ongoingEvents = eventsWithAnalytics.filter((event) => event.status === 'Ongoing');

    return res.status(200).json({
      events: eventsWithAnalytics,
      ongoingEvents,
      totalEventAnalytics
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while fetching organizer dashboard.' });
  }
}