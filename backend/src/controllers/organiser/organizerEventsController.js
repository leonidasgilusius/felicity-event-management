import Event from '../../models/event/Event.js';
import NormalEvent from '../../models/event/NormalEvent.js';
import MerchandiseEvent from '../../models/event/MerchandiseEvent.js';
import Organizer from '../../models/user/Organizer.js';
import { Registration, MerchandiseOrder } from '../../models/Registration.js';
import User from '../../models/user/User.js';
import Participant from '../../models/user/Participant.js';
import AttendanceAudit from '../../models/AttendanceAudit.js';
import EventFeedback from '../../models/EventFeedback.js';
import QRCode from 'qrcode';
import { sendMerchandiseEmail } from '../../scripts/emailService.js';

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

function isEventHappeningNow(event) {
  const now = new Date();
  if (!event?.startDate || !event?.endDate) return false;
  return now >= new Date(event.startDate) && now <= new Date(event.endDate);
}

function formatAttendanceParticipants(registrations) {
  return registrations.map((registration) => ({
    registrationId: registration._id,
    participantId: registration.user?._id || null,
    name: registration.user?.name || 'Unknown',
    email: registration.user?.email || '',
    ticketId: registration.ticketId,
    status: registration.status,
    checkInTime: registration.checkInTime || null,
    scanned: registration.status === 'attended',
  }));
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
      maxPerUser,
      paymentDetails
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
        maxPerUser: maxPerUser || 1,
        paymentDetails: paymentDetails || ''
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

// ── GET /organizerEvents/:eventId/feedback ──────────────────────────────────
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

// ── GET /organizerEvents/:eventId/attendance ─────────────────────────────────
export async function getAttendanceOverview(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId }).lean();
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }
    if (event.type !== 'normal') {
      return res.status(400).json({ message: 'Attendance scanner is available for normal events only.' });
    }
    if (!isEventHappeningNow(event)) {
      return res.status(400).json({ message: 'Attendance can only be tracked while the event is ongoing.' });
    }

    const registrations = await Registration.find({
      event: eventId,
      type: 'ticket',
      status: { $ne: 'cancelled' },
    })
      .populate('user', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    const participants = formatAttendanceParticipants(registrations);
    const scannedCount = participants.filter((p) => p.scanned).length;

    return res.status(200).json({
      event: {
        _id: event._id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
      },
      stats: {
        total: participants.length,
        scanned: scannedCount,
        notScanned: participants.length - scannedCount,
      },
      participants,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while loading attendance overview.' });
  }
}

// ── POST /organizerEvents/:eventId/attendance/scan ───────────────────────────
export async function scanAttendanceTicket(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;
    const { ticketId } = req.body;

    if (!ticketId || typeof ticketId !== 'string') {
      return res.status(400).json({ message: 'ticketId is required.' });
    }

    const event = await Event.findOne({ _id: eventId, organizer: organizerId }).lean();
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }
    if (!isEventHappeningNow(event)) {
      return res.status(400).json({ message: 'Attendance scanning is allowed only while the event is ongoing.' });
    }

    const registration = await Registration.findOne({
      event: eventId,
      ticketId: ticketId.trim(),
      type: 'ticket',
      status: { $ne: 'cancelled' },
    }).populate('user', 'name email');

    if (!registration) {
      return res.status(404).json({ message: 'Invalid ticket for this event.' });
    }

    if (registration.status === 'attended') {
      await AttendanceAudit.create({
        event: eventId,
        registration: registration._id,
        participant: registration.user._id,
        organizer: organizerId,
        action: 'scan_duplicate',
        note: 'Duplicate scan rejected.',
      });

      return res.status(409).json({
        message: 'This ticket has already been scanned.',
        participant: {
          registrationId: registration._id,
          name: registration.user?.name || 'Unknown',
          email: registration.user?.email || '',
          ticketId: registration.ticketId,
          checkInTime: registration.checkInTime || null,
        },
      });
    }

    registration.status = 'attended';
    registration.checkInTime = new Date();
    await registration.save();

    await AttendanceAudit.create({
      event: eventId,
      registration: registration._id,
      participant: registration.user._id,
      organizer: organizerId,
      action: 'scan_mark_attended',
      note: 'Marked attended by QR scan.',
    });

    return res.status(200).json({
      message: 'Attendance marked successfully.',
      participant: {
        registrationId: registration._id,
        name: registration.user?.name || 'Unknown',
        email: registration.user?.email || '',
        ticketId: registration.ticketId,
        checkInTime: registration.checkInTime,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while scanning ticket.' });
  }
}

// ── POST /organizerEvents/:eventId/attendance/manual ─────────────────────────
export async function manualMarkAttendance(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;
    const { registrationId, note = '' } = req.body;

    if (!registrationId) {
      return res.status(400).json({ message: 'registrationId is required for manual override.' });
    }

    const event = await Event.findOne({ _id: eventId, organizer: organizerId }).lean();
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }
    if (!isEventHappeningNow(event)) {
      return res.status(400).json({ message: 'Manual attendance override is allowed only while the event is ongoing.' });
    }

    const registration = await Registration.findOne({
      _id: registrationId,
      event: eventId,
      type: 'ticket',
      status: { $ne: 'cancelled' },
    }).populate('user', 'name email');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found for this event.' });
    }

    if (registration.status === 'attended') {
      await AttendanceAudit.create({
        event: eventId,
        registration: registration._id,
        participant: registration.user._id,
        organizer: organizerId,
        action: 'manual_already_attended',
        note: note || 'Manual override attempted but participant already marked attended.',
      });

      return res.status(200).json({
        message: 'Participant is already marked present.',
        participant: {
          registrationId: registration._id,
          name: registration.user?.name || 'Unknown',
          email: registration.user?.email || '',
          ticketId: registration.ticketId,
          checkInTime: registration.checkInTime || null,
        },
      });
    }

    registration.status = 'attended';
    registration.checkInTime = new Date();
    await registration.save();

    await AttendanceAudit.create({
      event: eventId,
      registration: registration._id,
      participant: registration.user._id,
      organizer: organizerId,
      action: 'manual_mark_attended',
      note: note || 'Marked present via manual override.',
    });

    return res.status(200).json({
      message: 'Participant marked present manually.',
      participant: {
        registrationId: registration._id,
        name: registration.user?.name || 'Unknown',
        email: registration.user?.email || '',
        ticketId: registration.ticketId,
        checkInTime: registration.checkInTime,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while applying manual override.' });
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
      stock, variants, maxPerUser, paymentDetails
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
      if (paymentDetails !== undefined && event.type === 'merchandise') event.paymentDetails = paymentDetails;
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

// ── GET /organizerEvents/:eventId/orders ──────────────────────────────────────
export async function getEventOrders(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId }).lean();
    if (!event) return res.status(404).json({ message: 'Event not found for this organizer.' });
    if (event.type !== 'merchandise') return res.status(400).json({ message: 'Only merchandise events have orders.' });

    const orders = await MerchandiseOrder.find({ event: eventId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const normalizeSelectedVariants = (value) => {
      if (!value) return {};
      if (typeof value.entries === 'function') return Object.fromEntries(value.entries());
      if (Array.isArray(value)) return Object.fromEntries(value);
      if (typeof value === 'object') return value;
      return {};
    };

    const result = orders.map((o) => ({
      _id: o._id,
      name: o.user?.name || 'Unknown',
      email: o.user?.email || '',
      quantity: o.quantity,
      totalPrice: o.totalPrice,
      selectedVariants: normalizeSelectedVariants(o.selectedVariants),
      paymentStatus: o.paymentStatus,
      status: o.status,
      hasProof: !!o.paymentProofUrl,   // don't send base64 in list – fetch on demand
      ticketId: o.ticketId,
      orderedAt: o.createdAt,
    }));

    return res.status(200).json({ orders: result, eventTitle: event.title, event });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while fetching orders.' });
  }
}

// ── GET /organizerEvents/orders/:orderId/proof ───────────────────────────────
export async function getOrderProof(req, res) {
  try {
    const organizerId = req.user._id;
    const order = await MerchandiseOrder.findById(req.params.orderId).populate('event').lean();
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (String(order.event.organizer) !== String(organizerId)) {
      return res.status(403).json({ message: 'Not your event.' });
    }
    if (!order.paymentProofUrl) {
      return res.status(404).json({ message: 'No payment proof has been uploaded yet.' });
    }
    return res.json({ paymentProofUrl: order.paymentProofUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── PATCH /organizerEvents/orders/:orderId/approve ────────────────────────────
export async function approveOrder(req, res) {
  try {
    const organizerId = req.user._id;
    const { orderId } = req.params;

    const order = await MerchandiseOrder.findById(orderId).populate('event');
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Verify event belongs to this organizer
    if (String(order.event.organizer) !== String(organizerId)) {
      return res.status(403).json({ message: 'Not your event.' });
    }

    if (order.paymentStatus === 'approved') {
      return res.status(400).json({ message: 'Order is already approved.' });
    }

    if (!order.paymentProofUrl) {
      return res.status(400).json({ message: 'No payment proof uploaded yet.' });
    }

    const event = order.event;

    // Check stock
    if (event.stock < order.quantity) {
      return res.status(400).json({ message: 'Not enough stock to approve this order.' });
    }

    // Approve
    order.paymentStatus = 'approved';
    order.status = 'confirmed';
    await order.save();

    // Decrement stock
    await MerchandiseEvent.findByIdAndUpdate(event._id, {
      $inc: { stock: -order.quantity, currentRegistrations: order.quantity }
    });

    // Generate QR and send email
    const qrDataUrl = await QRCode.toDataURL(order.ticketId, { width: 200 });
    const participant = await Participant.findById(order.user).select('email name').lean();

    sendMerchandiseEmail({
      toEmail: participant?.email,
      participantName: participant?.name || 'Customer',
      eventTitle: event.title,
      ticketId: order.ticketId,
      totalPrice: order.totalPrice,
    }).catch((e) => console.error('[email]', e.message));

    return res.status(200).json({
      message: 'Order approved. QR sent to participant.',
      qrDataUrl,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while approving order.' });
  }
}

// ── PATCH /organizerEvents/orders/:orderId/reject ─────────────────────────────
export async function rejectOrder(req, res) {
  try {
    const organizerId = req.user._id;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await MerchandiseOrder.findById(orderId).populate('event', 'organizer title');
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (String(order.event.organizer) !== String(organizerId)) {
      return res.status(403).json({ message: 'Not your event.' });
    }

    if (order.paymentStatus === 'rejected') {
      return res.status(400).json({ message: 'Order is already rejected.' });
    }

    order.paymentStatus = 'rejected';
    order.status = 'pending';
    await order.save();

    return res.status(200).json({ message: 'Order rejected.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while rejecting order.' });
  }
}
