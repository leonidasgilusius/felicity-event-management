import Event from '../../models/event/Event.js';
import NormalEvent from '../../models/event/NormalEvent.js';
import MerchandiseEvent from '../../models/event/MerchandiseEvent.js';
import { Registration, TicketRegistration, MerchandiseOrder } from '../../models/Registration.js';
import EventFeedback from '../../models/EventFeedback.js';
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
      const isApproved = existing.type !== 'order' || existing.paymentStatus === 'approved';
      const qrDataUrl = isApproved
        ? await QRCode.toDataURL(existing.ticketId, { width: 200 })
        : null;

      existingTicket = {
        orderId: existing._id,
        ticketId: existing.ticketId,
        qrDataUrl,
        eventTitle: event.title,
        totalPrice: existing.totalPrice ?? null,
        registrationFee: event.registrationFee,
        paymentStatus: existing.paymentStatus ?? null,
        hasProof: !!(existing.paymentProofUrl),
        message: existing.type === 'order'
          ? (existing.paymentStatus === 'approved'
              ? 'Your order has been approved!'
              : existing.paymentStatus === 'rejected'
              ? 'Your payment was rejected. Please re-upload your payment proof.'
              : 'Order placed. Upload your payment proof below.')
          : 'You are registered for this event.',
      };
    }

    // For merchandise: "alreadyRegistered" only blocks re-ordering if there's an active non-rejected pending/approved order
    const blocksNewOrder = existing && existing.type === 'order'
      ? existing.paymentStatus !== 'rejected'
      : !!existing;

    let feedback = {
      canSubmit: false,
      hasSubmitted: false,
      existing: null,
    };

    if (event.type === 'normal') {
      const attendedRegistration = await Registration.findOne({
        event: event._id,
        user: req.user._id,
        type: 'ticket',
        status: 'attended',
      }).lean();

      const existingFeedback = await EventFeedback.findOne({ event: event._id, user: req.user._id }).lean();

      feedback = {
        canSubmit: !!attendedRegistration && !existingFeedback,
        hasSubmitted: !!existingFeedback,
        existing: existingFeedback
          ? {
              rating: existingFeedback.rating,
              comment: existingFeedback.comment,
              submittedAt: existingFeedback.createdAt,
            }
          : null,
      };
    }

    return res.json({ event, alreadyRegistered: blocksNewOrder, existingTicket, feedback });
  } catch (err) {
    console.error('[getEventDetail]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ── POST /participantEvents/:id/feedback ─────────────────────────────────────
export const submitEventFeedback = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.type !== 'normal') {
      return res.status(400).json({ message: 'Feedback is available for attended normal events only.' });
    }

    const { rating, comment = '' } = req.body;
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
    }

    const attendedRegistration = await Registration.findOne({
      event: event._id,
      user: req.user._id,
      type: 'ticket',
      status: 'attended',
    }).lean();

    if (!attendedRegistration) {
      return res.status(403).json({ message: 'You can submit feedback only after attendance is marked (QR scanned).' });
    }

    const alreadySubmitted = await EventFeedback.findOne({ event: event._id, user: req.user._id }).lean();
    if (alreadySubmitted) {
      return res.status(400).json({ message: 'You have already submitted feedback for this event.' });
    }

    const feedback = await EventFeedback.create({
      event: event._id,
      user: req.user._id,
      registration: attendedRegistration._id,
      rating: numericRating,
      comment: String(comment || '').trim(),
    });

    return res.status(201).json({
      message: 'Thank you for your feedback! It has been submitted anonymously.',
      feedback: {
        rating: feedback.rating,
        comment: feedback.comment,
        submittedAt: feedback.createdAt,
      },
    });
  } catch (err) {
    console.error('[submitEventFeedback]', err);
    return res.status(500).json({ message: 'Server error while submitting feedback.' });
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

    let message = 'Registered successfully!'

    try {
      sendTicketEmail({
        toEmail: participant?.email || req.user.email,
        participantName: participant?.name || 'Participant',
        eventTitle: event.title,
        ticketId,
        startDate: event.startDate,
        location: event.location,
      })

      message += ' Ticket sent to your email.'
    } catch (error) {
      console.error('[email]', error.message)
    }

    return res.status(201).json({
      message: message,
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

    const { quantity = 1, selectedVariants = {}, formResponses = [] } = req.body;

    // Per-user limit – exclude rejected orders so rejected users can retry
    const userOrders = await MerchandiseOrder.countDocuments({
      event: event._id,
      user: req.user._id,
      paymentStatus: { $ne: 'rejected' },
    });
    if (userOrders >= event.maxPerUser) {
      return res.status(400).json({ message: `You can only order ${event.maxPerUser} of this item.` });
    }

    const totalPrice = event.registrationFee * quantity;
    const ticketId = crypto.randomUUID();

    const order = await MerchandiseOrder.create({
      event: event._id,
      user: req.user._id,
      ticketId,
      quantity,
      selectedVariants,
      formResponses,
      totalPrice,
      status: 'pending',
      paymentStatus: 'pending_approval',
    });

    return res.status(201).json({
      message: 'Order placed! Please upload your payment proof to complete the purchase.',
      orderId: order._id,
      ticketId,
      eventTitle: event.title,
      totalPrice,
      paymentStatus: 'pending_approval',
    });
  } catch (err) {
    console.error('[orderMerchandise]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ── PUT /participantEvents/:id/payment-proof ──────────────────────────────────
export const uploadPaymentProof = async (req, res) => {
  try {
    const { paymentProofDataUrl, paymentProofUrl } = req.body;

    let normalizedProof = null;

    if (typeof paymentProofUrl === 'string' && paymentProofUrl.trim()) {
      const trimmed = paymentProofUrl.trim();
      try {
        const parsed = new URL(trimmed);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return res.status(400).json({ message: 'Payment proof link must use http/https.' });
        }
      } catch {
        return res.status(400).json({ message: 'Invalid payment proof link.' });
      }
      normalizedProof = trimmed;
    } else if (typeof paymentProofDataUrl === 'string' && paymentProofDataUrl) {
      if (!paymentProofDataUrl.startsWith('data:image/')) {
        return res.status(400).json({ message: 'Payment proof must be an image or a valid link.' });
      }
      const maxChars = 3 * 1024 * 1024;
      if (paymentProofDataUrl.length > maxChars) {
        return res.status(413).json({
          message: 'Image is too large. Please upload a smaller image (<= 2MB) or paste a Drive link.'
        });
      }
      normalizedProof = paymentProofDataUrl;
    } else {
      return res.status(400).json({ message: 'Provide either an image or a share link for payment proof.' });
    }

    const order = await MerchandiseOrder.findOne({
      event: req.params.id,
      user: req.user._id,
      paymentStatus: { $in: ['pending_approval', 'rejected'] },
    });
    if (!order) {
      return res.status(404).json({ message: 'No pending order found for this event.' });
    }

    order.paymentProofUrl = normalizedProof;
    order.paymentStatus = 'pending_approval';
    await order.save();

    return res.json({ message: 'Payment proof submitted. Awaiting organizer approval.' });
  } catch (err) {
    console.error('[uploadPaymentProof]', err);
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
