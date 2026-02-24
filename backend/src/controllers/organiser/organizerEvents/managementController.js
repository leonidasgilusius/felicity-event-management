import Event from '../../../models/event/Event.js';
import {
  getDisplayStatus,
  normalizeEligibility,
  normalizeEventTags,
  validateEventTimeline
} from './utils.js';

export async function updateOrganizerEvent(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }

    const status = event.status;
    const displayStatus = getDisplayStatus(event);

    if (['Ongoing', 'Completed', 'Closed'].includes(displayStatus)) {
      return res.status(400).json({ message: 'Ongoing/Completed/Closed events cannot be edited.' });
    }

    if (['ongoing', 'completed', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Ongoing/Completed/Closed events cannot be edited.' });
    }

    const {
      title, description, eligibility, registrationDeadline, registrationLimit,
      registrationFee, startDate, endDate, eventTags, location,
      stock, variants, maxPerUser, paymentDetails
    } = req.body;

    if (status === 'draft') {
      const nextStartDate = startDate !== undefined ? startDate : event.startDate;
      const nextEndDate = endDate !== undefined ? endDate : event.endDate;
      const nextRegistrationDeadline = registrationDeadline !== undefined
        ? registrationDeadline
        : event.registrationDeadline;

      const timelineError = validateEventTimeline({
        startDate: nextStartDate,
        endDate: nextEndDate,
        registrationDeadline: nextRegistrationDeadline,
      });
      if (timelineError) {
        return res.status(400).json({ message: timelineError });
      }

      if (title !== undefined) event.title = title;
      if (description !== undefined) event.description = description;
      if (eligibility !== undefined) {
        const normalizedEligibility = normalizeEligibility(eligibility);
        if (!normalizedEligibility) {
          return res.status(400).json({ message: 'Eligibility must be either All or IIIT.' });
        }
        event.eligibility = normalizedEligibility;
      }
      if (registrationDeadline !== undefined) event.registrationDeadline = registrationDeadline;
      if (registrationLimit !== undefined) event.registrationLimit = Number(registrationLimit);
      if (registrationFee !== undefined) event.registrationFee = Number(registrationFee);
      if (startDate !== undefined) event.startDate = startDate;
      if (endDate !== undefined) event.endDate = endDate;
      if (eventTags !== undefined) {
        const normalizedEventTags = normalizeEventTags(eventTags);
        if (normalizedEventTags.length === 0) {
          return res.status(400).json({ message: 'Select at least one valid event category.' });
        }
        event.eventTags = normalizedEventTags;
      }
      if (location !== undefined && event.type === 'normal') event.location = location;
      if (stock !== undefined && event.type === 'merchandise') event.stock = Number(stock);
      if (variants !== undefined && event.type === 'merchandise') event.variants = variants;
      if (maxPerUser !== undefined && event.type === 'merchandise') event.maxPerUser = Number(maxPerUser);
      if (paymentDetails !== undefined && event.type === 'merchandise') event.paymentDetails = paymentDetails;
    } else if (status === 'published') {
      if (description !== undefined) event.description = description;
      if (registrationDeadline !== undefined) {
        if (new Date(registrationDeadline) < new Date(event.registrationDeadline)) {
          return res.status(400).json({ message: 'Cannot shorten the registration deadline for a published event.' });
        }
        if (new Date(registrationDeadline) >= new Date(event.endDate)) {
          return res.status(400).json({ message: 'Registration deadline must be before end date.' });
        }
        event.registrationDeadline = registrationDeadline;
      }
      if (registrationLimit !== undefined) {
        if (Number(registrationLimit) < event.registrationLimit) {
          return res.status(400).json({ message: 'Cannot reduce the registration limit for a published event.' });
        }
        event.registrationLimit = Number(registrationLimit);
      }
    }

    await event.save();
    return res.status(200).json({ message: 'Event updated successfully.', event });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while updating event.' });
  }
}

export async function changeEventStatus(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;
    const { status: newStatus } = req.body;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }

    const allowedTransitions = {
      published: ['closed'],
      ongoing: ['completed', 'closed'],
      completed: ['closed'],
      closed: [],
      draft: ['published']
    };

    const allowed = allowedTransitions[event.status] || [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        message: `Cannot change status from '${event.status}' to '${newStatus}'.`
      });
    }

    if (newStatus === 'published' && event.type === 'normal' &&
        (!Array.isArray(event.formSchema) || event.formSchema.length === 0)) {
      return res.status(400).json({ message: 'Define form fields before publishing a normal event.' });
    }

    if (newStatus === 'published') {
      const timelineError = validateEventTimeline({
        startDate: event.startDate,
        endDate: event.endDate,
        registrationDeadline: event.registrationDeadline,
      });
      if (timelineError) {
        return res.status(400).json({ message: timelineError });
      }
    }

    event.status = newStatus;
    if (newStatus === 'closed' || newStatus === 'completed') {
      event.registrationStatus = 'closed';
    }
    await event.save();

    return res.status(200).json({ message: `Event status changed to '${newStatus}'.`, event });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while changing event status.' });
  }
}

export async function closeEventRegistration(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }

    if (event.status !== 'published') {
      return res.status(400).json({ message: 'Registration can only be closed for published events.' });
    }

    if (event.registrationStatus === 'closed') {
      return res.status(400).json({ message: 'Registration is already closed for this event.' });
    }

    event.registrationStatus = 'closed';
    await event.save();

    return res.status(200).json({ message: 'Registration closed successfully.', event });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while closing registration.' });
  }
}