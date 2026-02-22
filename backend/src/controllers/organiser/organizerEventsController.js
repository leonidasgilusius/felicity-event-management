import Event from '../../models/event/Event.js';
import NormalEvent from '../../models/event/NormalEvent.js';
import MerchandiseEvent from '../../models/event/MerchandiseEvent.js';
import Organizer from '../../models/user/Organizer.js';
import { Registration } from '../../models/Registration.js';
import User from '../../models/user/User.js';

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

    // Discord webhook – post new event announcement if organizer has one configured
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

// ── GET /organizerEvents/:eventId ─────────────────────────────────────────────
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
      // merchandise fields
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

// ── PATCH /organizerEvents/:eventId/edit ──────────────────────────────────────
export async function updateOrganizerEvent(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }

    const status = event.status;

    if (['ongoing', 'completed', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Ongoing/Completed/Closed events cannot be edited.' });
    }

    const {
      title, description, eligibility, registrationDeadline, registrationLimit,
      registrationFee, startDate, endDate, eventTags, location,
      stock, variants, maxPerUser
    } = req.body;

    if (status === 'draft') {
      // Free edits
      if (title !== undefined) event.title = title;
      if (description !== undefined) event.description = description;
      if (eligibility !== undefined) event.eligibility = eligibility;
      if (registrationDeadline !== undefined) event.registrationDeadline = registrationDeadline;
      if (registrationLimit !== undefined) event.registrationLimit = Number(registrationLimit);
      if (registrationFee !== undefined) event.registrationFee = Number(registrationFee);
      if (startDate !== undefined) event.startDate = startDate;
      if (endDate !== undefined) event.endDate = endDate;
      if (eventTags !== undefined) event.eventTags = Array.isArray(eventTags) ? eventTags : [];
      if (location !== undefined && event.type === 'normal') event.location = location;
      if (stock !== undefined && event.type === 'merchandise') event.stock = Number(stock);
      if (variants !== undefined && event.type === 'merchandise') event.variants = variants;
      if (maxPerUser !== undefined && event.type === 'merchandise') event.maxPerUser = Number(maxPerUser);
    } else if (status === 'published') {
      // Limited edits: description, extend deadline, increase limit, close registrations
      if (description !== undefined) event.description = description;
      if (registrationDeadline !== undefined) {
        if (new Date(registrationDeadline) < new Date(event.registrationDeadline)) {
          return res.status(400).json({ message: 'Cannot shorten the registration deadline for a published event.' });
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

// ── PATCH /organizerEvents/:eventId/status ────────────────────────────────────
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
      completed: [],
      closed: [],
      draft: ['published']
    };

    const allowed = allowedTransitions[event.status] || [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        message: `Cannot change status from '${event.status}' to '${newStatus}'.`
      });
    }

    // Extra validation for publishing
    if (newStatus === 'published' && event.type === 'normal' &&
        (!Array.isArray(event.formSchema) || event.formSchema.length === 0)) {
      return res.status(400).json({ message: 'Define form fields before publishing a normal event.' });
    }

    event.status = newStatus;
    await event.save();

    return res.status(200).json({ message: `Event status changed to '${newStatus}'.`, event });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while changing event status.' });
  }
}
