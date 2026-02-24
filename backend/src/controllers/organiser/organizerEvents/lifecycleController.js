import Event from '../../../models/event/Event.js';
import NormalEvent from '../../../models/event/NormalEvent.js';
import MerchandiseEvent from '../../../models/event/MerchandiseEvent.js';
import Organizer from '../../../models/user/Organizer.js';
import { Registration } from '../../../models/Registration.js';
import {
  normalizeEligibility,
  normalizeEventTags,
  normalizeFormFields,
  validateEventTimeline,
  validateFormFields
} from './utils.js';

export async function createDraftEvent(req, res) {
  try {
    const organizerId = req.user._id;
    const {
      title,
      description,
      eligibility,
      registrationDeadline,
      registrationLimit,
      registrationFee,
      startDate,
      endDate,
      eventTags,
      eventType,
      location,
      stock,
      variants,
      maxPerUser,
      paymentDetails
    } = req.body;

    const normalizedEventTags = normalizeEventTags(eventTags);

    if (normalizedEventTags.length === 0) {
      return res.status(400).json({ message: 'Select at least one valid event category.' });
    }

    if (!title || !description || !registrationDeadline || !registrationLimit || registrationFee === undefined || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required event fields.' });
    }

    const timelineError = validateEventTimeline({ startDate, endDate, registrationDeadline });
    if (timelineError) {
      return res.status(400).json({ message: timelineError });
    }

    const normalizedEligibility = eligibility === undefined
      ? 'All'
      : normalizeEligibility(eligibility);

    if (!normalizedEligibility) {
      return res.status(400).json({ message: 'Eligibility must be either All or IIIT.' });
    }

    const basePayload = {
      title,
      description,
      organizer: organizerId,
      status: 'draft',
      eligibility: normalizedEligibility,
      registrationDeadline,
      registrationLimit,
      registrationFee,
      startDate,
      endDate,
      eventTags: normalizedEventTags
    };

    let event;

    if (eventType === 'merchandise') {
      if (stock === undefined) {
        return res.status(400).json({ message: 'Stock is required for merchandise events.' });
      }

      event = await MerchandiseEvent.create({
        ...basePayload,
        registrationStatus: 'open',
        stock,
        variants: Array.isArray(variants) ? variants : [],
        maxPerUser: maxPerUser || 1,
        paymentDetails: paymentDetails || ''
      });
    } else {
      event = await NormalEvent.create({
        ...basePayload,
        registrationStatus: 'open',
        location: location || '',
        formSchema: []
      });
    }

    return res.status(201).json({
      message: 'Draft event created successfully.',
      event
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while creating draft event.' });
  }
}

export async function updateEventFormSchema(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;
    const { formFields } = req.body;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }

    if (!['draft', 'published'].includes(event.status)) {
      return res.status(400).json({ message: 'Form fields can only be edited while the event is in draft or published.' });
    }

    const hasRegistrations = await Registration.exists({ event: eventId });
    if (hasRegistrations) {
      return res.status(400).json({ message: 'Form fields are locked after first registration.' });
    }

    const normalizedFields = normalizeFormFields(formFields);
    const validationError = validateFormFields(normalizedFields);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    event.formSchema = normalizedFields;
    await event.save();

    return res.status(200).json({
      message: 'Form fields updated successfully.',
      event
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while updating form fields.' });
  }
}

export async function deleteDraftEvent(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }

    if (event.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft events can be deleted.' });
    }

    const hasRegistrations = await Registration.exists({ event: eventId });
    if (hasRegistrations) {
      return res.status(400).json({ message: 'Cannot delete draft after registrations exist.' });
    }

    await Event.deleteOne({ _id: eventId, organizer: organizerId });
    return res.status(200).json({ message: 'Draft event deleted successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while deleting draft event.' });
  }
}

export async function publishEvent(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }

    const timelineError = validateEventTimeline({
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
    });
    if (timelineError) {
      return res.status(400).json({ message: timelineError });
    }

    event.status = 'published';
    event.registrationStatus = 'open';
    await event.save();

    try {
      const organizer = await Organizer.findById(organizerId).select('discordWebhook name').lean();
      if (organizer?.discordWebhook) {
        const payload = {
          content: `🎉 **New Event Published!**\n**${event.title}**\nStarts: ${new Date(event.startDate).toLocaleString()}\nEligibility: ${event.eligibility || 'All'}`
        };
        await fetch(organizer.discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch (webhookErr) {
      console.warn('[Discord webhook]', webhookErr.message);
    }

    return res.status(200).json({
      message: 'Event published successfully.',
      event
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while publishing event.' });
  }
}