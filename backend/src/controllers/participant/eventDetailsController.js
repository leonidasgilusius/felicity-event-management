import Event from '../../models/event/Event.js';
import NormalEvent from '../../models/event/NormalEvent.js';
import MerchandiseEvent from '../../models/event/MerchandiseEvent.js';
import { Registration, TicketRegistration, MerchandiseOrder } from '../../models/Registration.js';
import EventFeedback from '../../models/EventFeedback.js';
import Participant from '../../models/user/Participant.js';
import QRCode from 'qrcode';
import { sendTicketEmail, sendMerchandiseEmail } from '../../scripts/emailService.js';

function canParticipantAccessEvent(event, participant) {
  if (!event || !participant) return false;
  if (event.eligibility !== 'IIIT') return true;
  return Boolean(participant.isIIIT);
}

function getRuntimeEventStatus(event) {
  const now = Date.now();
  const startMs = new Date(event.startDate).getTime();
  const endMs = new Date(event.endDate).getTime();

  if (event.status === 'draft') return 'draft';
  if (event.status === 'closed' || event.status === 'completed') return 'completed';
  if (Number.isFinite(endMs) && now > endMs) return 'completed';
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && now >= startMs && now <= endMs) {
    return 'ongoing';
  }
  return 'published';
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeFormResponses(formSchema = [], incomingResponses = []) {
  const responseMap = new Map(
    (Array.isArray(incomingResponses) ? incomingResponses : []).map((response) => [
      String(response?.label || '').trim(),
      response?.answer,
    ])
  );

  const normalized = [];

  for (const field of Array.isArray(formSchema) ? formSchema : []) {
    const label = String(field?.label || '').trim();
    if (!label) continue;

    let answer = responseMap.has(label) ? responseMap.get(label) : '';

    if (field.fieldType === 'file') {
      answer = String(answer || '').trim();
      if (field.required && !answer) {
        return { error: `${label} is required.` };
      }
      if (answer && !isValidHttpUrl(answer)) {
        return { error: `${label} must be a valid http/https link.` };
      }
    }

    normalized.push({ label, answer });
  }

  return { responses: normalized };
}

export const getEventDetail = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name category description email')
      .lean();

    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const participant = await Participant.findById(req.user._id).select('isIIIT').lean();
    if (!participant) return res.status(404).json({ message: 'Participant not found.' });
    if (!canParticipantAccessEvent(event, participant)) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    const eventWithRuntimeStatus = {
      ...event,
      status: getRuntimeEventStatus(event),
    };

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
        registrationFee: eventWithRuntimeStatus.registrationFee,
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

    const blocksNewOrder = existing && existing.type === 'order'
      ? existing.paymentStatus !== 'rejected'
      : !!existing;

    let feedback = {
      canSubmit: false,
      hasSubmitted: false,
      existing: null,
    };

    if (['normal', 'merchandise'].includes(eventWithRuntimeStatus.type)) {
      const feedbackEligibilityQuery = {
        event: eventWithRuntimeStatus._id,
        user: req.user._id,
        status: 'attended',
      };

      if (eventWithRuntimeStatus.type === 'normal') {
        feedbackEligibilityQuery.type = 'ticket';
      } else {
        feedbackEligibilityQuery.type = 'order';
        feedbackEligibilityQuery.paymentStatus = 'approved';
      }

      const attendedRegistration = await Registration.findOne(feedbackEligibilityQuery).lean();

      const existingFeedback = await EventFeedback.findOne({ event: eventWithRuntimeStatus._id, user: req.user._id }).lean();

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

    return res.json({ event: eventWithRuntimeStatus, alreadyRegistered: blocksNewOrder, existingTicket, feedback });
  } catch (err) {
    console.error('[getEventDetail]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

export const submitEventFeedback = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (!['normal', 'merchandise'].includes(event.type)) {
      return res.status(400).json({ message: 'Feedback is available for attended normal or merchandise events only.' });
    }

    const { rating, comment = '' } = req.body;
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
    }

    const feedbackEligibilityQuery = {
      event: event._id,
      user: req.user._id,
      status: 'attended',
    };

    if (event.type === 'normal') {
      feedbackEligibilityQuery.type = 'ticket';
    } else {
      feedbackEligibilityQuery.type = 'order';
      feedbackEligibilityQuery.paymentStatus = 'approved';
    }

    const attendedRegistration = await Registration.findOne(feedbackEligibilityQuery).lean();

    if (!attendedRegistration) {
      return res.status(403).json({
        message: event.type === 'merchandise'
          ? 'You can submit feedback only after your approved order is marked as collected.'
          : 'You can submit feedback only after attendance is marked (QR scanned).',
      });
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

export const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.type !== 'normal') return res.status(400).json({ message: 'Use /order for merchandise events.' });

    const participant = await Participant.findById(req.user._id).select('isIIIT email name').lean();
    if (!participant) return res.status(404).json({ message: 'Participant not found.' });
    if (!canParticipantAccessEvent(event, participant)) {
      return res.status(403).json({ message: 'You are not eligible to register for this event.' });
    }

    if (['closed', 'completed', 'draft'].includes(event.status)) {
      return res.status(400).json({ message: 'Registrations are not open for this event.' });
    }
    if (new Date(event.endDate) < new Date()) {
      return res.status(400).json({ message: 'This event has ended.' });
    }
    if (event.registrationStatus === 'closed') {
      return res.status(400).json({ message: 'Registrations are closed for this event.' });
    }
    if (event.currentRegistrations >= event.registrationLimit) {
      return res.status(400).json({ message: 'Registration limit reached.' });
    }

    const duplicate = await Registration.findOne({ event: event._id, user: req.user._id, status: { $ne: 'cancelled' } });
    if (duplicate) return res.status(400).json({ message: 'You are already registered for this event.' });

    const normalizedFormResponses = normalizeFormResponses(event.formSchema || [], req.body.formResponses || []);
    if (normalizedFormResponses.error) {
      return res.status(400).json({ message: normalizedFormResponses.error });
    }

    const ticketId = crypto.randomUUID();

    await TicketRegistration.create({
      event: event._id,
      user: req.user._id,
      ticketId,
      formResponses: normalizedFormResponses.responses,
    });

    await Event.findByIdAndUpdate(event._id, { $inc: { currentRegistrations: 1 } });

    const qrDataUrl = await QRCode.toDataURL(ticketId, { width: 200 });

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

export const orderMerchandise = async (req, res) => {
  try {
    const event = await MerchandiseEvent.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.type !== 'merchandise') return res.status(400).json({ message: 'Use /register for normal events.' });

    const participant = await Participant.findById(req.user._id).select('isIIIT').lean();
    if (!participant) return res.status(404).json({ message: 'Participant not found.' });
    if (!canParticipantAccessEvent(event, participant)) {
      return res.status(403).json({ message: 'You are not eligible to register for this event.' });
    }

    if (['closed', 'completed', 'draft'].includes(event.status)) {
      return res.status(400).json({ message: 'Purchases are not open for this item.' });
    }
    if (new Date(event.endDate) < new Date()) {
      return res.status(400).json({ message: 'This event has ended.' });
    }
    if (event.registrationStatus === 'closed') {
      return res.status(400).json({ message: 'Purchases are closed for this item.' });
    }
    if (event.stock <= 0) {
      return res.status(400).json({ message: 'This item is out of stock.' });
    }

    const { quantity = 1, selectedVariants = {}, formResponses = [] } = req.body;

    const normalizedFormResponses = normalizeFormResponses(event.formSchema || [], formResponses);
    if (normalizedFormResponses.error) {
      return res.status(400).json({ message: normalizedFormResponses.error });
    }

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
      formResponses: normalizedFormResponses.responses,
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

export const unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    if (['ongoing', 'completed', 'closed'].includes(event.status)) {
      return res.status(400).json({ message: 'You cannot unregister from an event that is ongoing, completed, or closed.' });
    }

    const registration = await Registration.findOne({ event: event._id, user: req.user._id, status: { $ne: 'cancelled' } });
    if (!registration) {
      return res.status(404).json({ message: 'You are not registered for this event.' });
    }

    registration.status = 'cancelled';
    await registration.save();

    await Event.findByIdAndUpdate(event._id, { $inc: { currentRegistrations: -1 } });

    return res.json({ message: 'Successfully unregistered from the event.' });
  } catch (err) {
    console.error('[unregisterFromEvent]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
