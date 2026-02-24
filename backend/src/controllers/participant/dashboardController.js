import { Registration } from '../../models/Registration.js';

const CANCELLED_REJECTED_STATUSES = ['cancelled', 'rejected'];

function getParticipationStatus(registration, event) {
  if (registration.paymentStatus === 'rejected') {
    return 'rejected';
  }

  if (registration.status === 'attended' || event?.status === 'completed') {
    return 'completed';
  }

  return registration.status;
}

function getTeamName(registration) {
  if (!Array.isArray(registration.formResponses)) {
    return null;
  }

  const teamField = registration.formResponses.find((response) =>
    typeof response?.label === 'string' && response.label.toLowerCase().includes('team')
  );

  if (!teamField || teamField.answer === undefined || teamField.answer === null) {
    return null;
  }

  return String(teamField.answer);
}

function mapRegistration(registration) {
  const event = registration.event;
  const organizer = event?.organizer;
  const participationStatus = getParticipationStatus(registration, event);

  return {
    registrationId: registration._id,
    eventId: event?._id,
    eventName: event?.title || 'Untitled Event',
    eventType: event?.type || 'unknown',
    organizer: organizer?.name || 'Organizer',
    schedule: {
      startDate: event?.startDate || null,
      endDate: event?.endDate || null
    },
    participationStatus,
    teamName: getTeamName(registration),
    ticketId: registration.ticketId,
    registrationStatus: registration.status,
    paymentStatus: registration.paymentStatus || null
  };
}

function isUpcoming(record) {
  if (CANCELLED_REJECTED_STATUSES.includes(record.participationStatus)) {
    return false;
  }

  if (record.participationStatus === 'completed') {
    return false;
  }

  if (record.schedule.endDate && new Date(record.schedule.endDate).getTime() <= Date.now()) {
    return false;
  }

  return true;
}

export async function getParticipantDashboard(req, res) {
  try {
    if (!req.user || req.user.role?.toLowerCase() !== 'participant') {
      return res.status(403).json({ message: 'Only participants can access this resource.' });
    }

    const registrations = await Registration.find({ user: req.user._id })
      .populate({
        path: 'event',
        select: 'title type organizer startDate endDate status',
        populate: {
          path: 'organizer',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });

    const records = registrations
      .filter((registration) => registration.event)
      .map(mapRegistration);

    const upcomingEvents = records.filter(isUpcoming);

    const participationHistory = {
      Normal: [],
      Merchandise: [],
      Completed: [],
      'Cancelled/Rejected': []
    };

    const historyRecords = records.filter((record) => !isUpcoming(record));

    participationHistory.Normal = historyRecords.filter(
      (record) => String(record.eventType || '').toLowerCase() === 'normal'
    );
    participationHistory.Merchandise = historyRecords.filter(
      (record) => String(record.eventType || '').toLowerCase() === 'merchandise'
    );
    participationHistory.Completed = historyRecords.filter((record) => record.participationStatus === 'completed');
    participationHistory['Cancelled/Rejected'] = historyRecords.filter((record) =>
      CANCELLED_REJECTED_STATUSES.includes(record.participationStatus)
    );

    return res.status(200).json({
      upcomingEvents,
      participationHistory,
      eventRecords: records
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while fetching participant dashboard data.' });
  }
}
