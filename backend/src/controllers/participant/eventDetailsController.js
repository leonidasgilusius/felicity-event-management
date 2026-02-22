import Event from '../../models/event/Event.js';
import NormalEvent from '../../models/event/NormalEvent.js';
import MerchandiseEvent from '../../models/event/MerchandiseEvent.js';
import { Registration, TicketRegistration, MerchandiseOrder } from '../../models/Registration.js';
import Participant from '../../models/user/Participant.js';
import QRCode from 'qrcode';
import { sendTicketEmail, sendMerchandiseEmail } from '../../scripts/emailService.js';

// ── GET /participantEvents/:id ────────────────────────────────────────────────
export const getEventDetail = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name category description email')
      .lean();

    if (!event) return res.status(404).json({ message: 'Event not found.' });

    // Check if the requesting participant is already registered
    const existing = await Registration.findOne({
      event: event._id,
      user: req.user._id,
      status: { $ne: 'cancelled' }
    }).lean();

    let existingTicket = null;
    if (existing) {
      const qrDataUrl = await QRCode.toDataURL(existing.ticketId, { width: 200 });
      existingTicket = {
        ticketId: existing.ticketId,
        qrDataUrl,
        eventTitle: event.title,
        totalPrice: existing.totalPrice ?? null,
        registrationFee: event.registrationFee,
        message: event.type === 'merchandise' ? 'You have already ordered this item.' : 'You are registered for this event.',
      };
    }

    return res.json({ event, alreadyRegistered: !!existing, existingTicket });
  } catch (err) {
    console.error('[getEventDetail]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ── POST /participantEvents/:id/register  (Normal event) ─────────────────────
export const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.type !== 'normal') return res.status(400).json({ message: 'Use /order for merchandise events.' });

    // Blocking checks
    if (['closed', 'completed', 'draft'].includes(event.status)) {
      return res.status(400).json({ message: 'Registrations are not open for this event.' });
    }
    if (new Date(event.registrationDeadline) < new Date()) {
      return res.status(400).json({ message: 'Registration deadline has passed.' });
    }
    if (event.currentRegistrations >= event.registrationLimit) {
      return res.status(400).json({ message: 'Registration limit reached.' });
    }

    // Duplicate check (ignore cancelled registrations)
    const duplicate = await Registration.findOne({ event: event._id, user: req.user._id, status: { $ne: 'cancelled' } });
    if (duplicate) return res.status(400).json({ message: 'You are already registered for this event.' });

    const ticketId = crypto.randomUUID();

    await TicketRegistration.create({
      event: event._id,
      user: req.user._id,
      ticketId,
      formResponses: req.body.formResponses || [],
    });

    // Increment registration count
    await Event.findByIdAndUpdate(event._id, { $inc: { currentRegistrations: 1 } });

    const qrDataUrl = await QRCode.toDataURL(ticketId, { width: 200 });

    // Send email (non-blocking)
    const participant = await Participant.findById(req.user._id).select('email name').lean();
    sendTicketEmail({
      toEmail: participant?.email || req.user.email,
      participantName: participant?.name || 'Participant',
      eventTitle: event.title,
      ticketId,
      startDate: event.startDate,
      location: event.location,
    }).catch((e) => console.error('[email]', e.message));

    return res.status(201).json({
      message: 'Registered successfully! Ticket sent to your email.',
      ticketId,
      qrDataUrl,
      eventTitle: event.title,
      registrationFee: event.registrationFee,
    });
  } catch (err) {
    console.error('[registerForEvent]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ── POST /participantEvents/:id/order  (Merchandise event) ───────────────────
export const orderMerchandise = async (req, res) => {
  try {
    const event = await MerchandiseEvent.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.type !== 'merchandise') return res.status(400).json({ message: 'Use /register for normal events.' });

    // Blocking checks
    if (['closed', 'completed', 'draft'].includes(event.status)) {
      return res.status(400).json({ message: 'Purchases are not open for this item.' });
    }
    if (new Date(event.registrationDeadline) < new Date()) {
      return res.status(400).json({ message: 'Purchase deadline has passed.' });
    }
    if (event.stock <= 0) {
      return res.status(400).json({ message: 'This item is out of stock.' });
    }

    const { quantity = 1, selectedVariants = {} } = req.body;

    // Per-user limit
    const userOrders = await MerchandiseOrder.countDocuments({ event: event._id, user: req.user._id });
    if (userOrders >= event.maxPerUser) {
      return res.status(400).json({ message: `You can only order ${event.maxPerUser} of this item.` });
    }

    const totalPrice = event.registrationFee * quantity;
    const ticketId = crypto.randomUUID();

    await MerchandiseOrder.create({
      event: event._id,
      user: req.user._id,
      ticketId,
      quantity,
      selectedVariants,
      totalPrice,
    });

    // Decrement stock
    await MerchandiseEvent.findByIdAndUpdate(event._id, { $inc: { stock: -quantity, currentRegistrations: quantity } });

    const qrDataUrl = await QRCode.toDataURL(ticketId, { width: 200 });

    const participant = await Participant.findById(req.user._id).select('email name').lean();
    sendMerchandiseEmail({
      toEmail: participant?.email || req.user.email,
      participantName: participant?.name || 'Participant',
      eventTitle: event.title,
      ticketId,
      totalPrice,
    }).catch((e) => console.error('[email]', e.message));

    return res.status(201).json({
      message: 'Order placed! Confirmation sent to your email.',
      ticketId,
      qrDataUrl,
      eventTitle: event.title,
      totalPrice,
    });
  } catch (err) {
    console.error('[orderMerchandise]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ── DELETE /participantEvents/:id/unregister ──────────────────────────────────
export const unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    // Only allow unregister for published events (before they start)
    if (['ongoing', 'completed', 'closed'].includes(event.status)) {
      return res.status(400).json({ message: 'You cannot unregister from an event that is ongoing, completed, or closed.' });
    }

    const registration = await Registration.findOne({ event: event._id, user: req.user._id, status: { $ne: 'cancelled' } });
    if (!registration) {
      return res.status(404).json({ message: 'You are not registered for this event.' });
    }

    registration.status = 'cancelled';
    await registration.save();

    // Decrement registration count
    await Event.findByIdAndUpdate(event._id, { $inc: { currentRegistrations: -1 } });

    return res.json({ message: 'Successfully unregistered from the event.' });
  } catch (err) {
    console.error('[unregisterFromEvent]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
