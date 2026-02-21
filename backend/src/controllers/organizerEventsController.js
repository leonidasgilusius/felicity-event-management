import Event from '../models/Event.js';
import NormalEvent from '../models/NormalEvent.js';
import MerchandiseEvent from '../models/MerchandiseEvent.js';
import Organizer from '../models/Organizer.js';
import { Registration } from '../models/Registration.js';

function getDisplayStatus(event) {
  const now = new Date();

  if (event.status === 'draft') {
    return 'Draft';
  }

  if (event.status === 'completed') {
    return 'Completed';
  }

  if (event.status === 'closed') {
    return 'Closed';
  }

  if (event.status === 'ongoing') {
    return 'Ongoing';
  }

  if (event.status === 'published') {
    if (event.startDate && event.endDate && now >= event.startDate && now <= event.endDate) {
      return 'Ongoing';
    }

    if (event.endDate && now > event.endDate) {
      return 'Closed';
    }

    return 'Published';
  }

  return 'Draft';
}

function getEventRevenue(event, registrations) {
  return registrations.reduce((sum, registration) => {
    if (registration.type === 'order') {
      if (registration.paymentStatus === 'approved' && Number.isFinite(registration.totalPrice)) {
        return sum + registration.totalPrice;
      }
      return sum;
    }

    if (registration.status !== 'cancelled' && Number.isFinite(event.registrationFee)) {
      return sum + event.registrationFee;
    }

    return sum;
  }, 0);
}

function getEventAnalytics(event, registrations) {
  return {
    registrations: registrations.length,
    sales: registrations.filter((registration) => registration.type === 'order' && registration.paymentStatus === 'approved').length,
    revenue: getEventRevenue(event, registrations),
    attendance: registrations.filter((registration) => registration.status === 'attended').length
  };
}

function normalizeFormFields(fields = []) {
  return fields.map((field, index) => ({
    label: String(field.label || '').trim(),
    fieldType: String(field.fieldType || '').trim().toLowerCase(),
    options: Array.isArray(field.options) ? field.options.map((option) => String(option).trim()).filter(Boolean) : [],
    required: Boolean(field.required),
    order: Number.isFinite(field.order) ? field.order : index
  }));
}

function validateFormFields(fields) {
  const allowedTypes = ['text', 'number', 'file', 'dropdown', 'checkbox', 'textarea'];

  if (!Array.isArray(fields)) {
    return 'formFields must be an array.';
  }

  for (const field of fields) {
    if (!field.label) {
      return 'Every field must include a label.';
    }

    if (!allowedTypes.includes(field.fieldType)) {
      return 'Invalid field type in form fields.';
    }

    if (field.fieldType === 'dropdown' && (!Array.isArray(field.options) || field.options.length === 0)) {
      return 'Dropdown fields must include options.';
    }
  }

  return null;
}

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
        status: displayStatus,
        analytics,
        startDate: event.startDate,
        endDate: event.endDate
      };
    });

    const completedEvents = eventsWithAnalytics.filter((event) => event.status === 'Completed');
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
      maxPerUser
    } = req.body;

    if (!title || !description || !registrationDeadline || !registrationLimit || registrationFee === undefined || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required event fields.' });
    }

    const basePayload = {
      title,
      description,
      organizer: organizerId,
      status: 'draft',
      eligibility: eligibility || 'All',
      registrationDeadline,
      registrationLimit,
      registrationFee,
      startDate,
      endDate,
      eventTags: Array.isArray(eventTags) ? eventTags : []
    };

    let event;

    if (eventType === 'merchandise') {
      if (stock === undefined) {
        return res.status(400).json({ message: 'Stock is required for merchandise events.' });
      }

      event = await MerchandiseEvent.create({
        ...basePayload,
        stock,
        variants: Array.isArray(variants) ? variants : [],
        maxPerUser: maxPerUser || 1
      });
    } else {
      event = await NormalEvent.create({
        ...basePayload,
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

    if (event.type !== 'normal') {
      return res.status(400).json({ message: 'Form builder is supported for normal events only.' });
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

export async function publishEvent(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }

    if (event.type === 'normal' && (!Array.isArray(event.formSchema) || event.formSchema.length === 0)) {
      return res.status(400).json({ message: 'Define form fields before publishing a normal event.' });
    }

    event.status = 'published';
    await event.save();

    return res.status(200).json({
      message: 'Event published successfully.',
      event
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while publishing event.' });
  }
}
