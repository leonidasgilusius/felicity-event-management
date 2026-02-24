import Event from '../../../models/event/Event.js';
import { Registration } from '../../../models/Registration.js';
import AttendanceAudit from '../../../models/AttendanceAudit.js';
import { formatAttendanceParticipants, isEventHappeningNow, normalizeSelectedVariants } from './utils.js';

export async function getAttendanceOverview(req, res) {
  try {
    const organizerId = req.user._id;
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, organizer: organizerId }).lean();
    if (!event) {
      return res.status(404).json({ message: 'Event not found for this organizer.' });
    }
    if (!['normal', 'merchandise'].includes(event.type)) {
      return res.status(400).json({ message: 'Attendance scanner is available for normal or merchandise events only.' });
    }
    if (!isEventHappeningNow(event)) {
      return res.status(400).json({ message: 'Attendance can only be tracked while the event is ongoing.' });
    }

    const registrationQuery = event.type === 'normal'
      ? {
          event: eventId,
          type: 'ticket',
          status: { $ne: 'cancelled' },
        }
      : {
          event: eventId,
          type: 'order',
          paymentStatus: 'approved',
          status: { $ne: 'cancelled' },
        };

    const registrations = await Registration.find(registrationQuery)
      .populate('user', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    const participants = formatAttendanceParticipants(registrations);
    const scannedCount = participants.filter((p) => p.scanned).length;

    return res.status(200).json({
      event: {
        _id: event._id,
        title: event.title,
        type: event.type,
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

    const registrationQuery = event.type === 'normal'
      ? {
          event: eventId,
          ticketId: ticketId.trim(),
          type: 'ticket',
          status: { $ne: 'cancelled' },
        }
      : {
          event: eventId,
          ticketId: ticketId.trim(),
          type: 'order',
          paymentStatus: 'approved',
          status: { $ne: 'cancelled' },
        };

    const registration = await Registration.findOne(registrationQuery).populate('user', 'name email');

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
          quantity: registration.quantity ?? null,
          paymentStatus: registration.paymentStatus || null,
          selectedVariants: normalizeSelectedVariants(registration.selectedVariants),
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
        quantity: registration.quantity ?? null,
        paymentStatus: registration.paymentStatus || null,
        selectedVariants: normalizeSelectedVariants(registration.selectedVariants),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while scanning ticket.' });
  }
}

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

    const registrationQuery = event.type === 'normal'
      ? {
          _id: registrationId,
          event: eventId,
          type: 'ticket',
          status: { $ne: 'cancelled' },
        }
      : {
          _id: registrationId,
          event: eventId,
          type: 'order',
          paymentStatus: 'approved',
          status: { $ne: 'cancelled' },
        };

    const registration = await Registration.findOne(registrationQuery).populate('user', 'name email');

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
          quantity: registration.quantity ?? null,
          paymentStatus: registration.paymentStatus || null,
          selectedVariants: normalizeSelectedVariants(registration.selectedVariants),
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
        quantity: registration.quantity ?? null,
        paymentStatus: registration.paymentStatus || null,
        selectedVariants: normalizeSelectedVariants(registration.selectedVariants),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while applying manual override.' });
  }
}