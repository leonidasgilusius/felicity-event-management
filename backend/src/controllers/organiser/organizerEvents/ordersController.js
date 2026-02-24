import Event from '../../../models/event/Event.js';
import MerchandiseEvent from '../../../models/event/MerchandiseEvent.js';
import { MerchandiseOrder } from '../../../models/Registration.js';
import Participant from '../../../models/user/Participant.js';
import QRCode from 'qrcode';
import { sendMerchandiseEmail } from '../../../scripts/emailService.js';
import { normalizeSelectedVariants } from './utils.js';

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

    const result = orders.map((order) => ({
      _id: order._id,
      name: order.user?.name || 'Unknown',
      email: order.user?.email || '',
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      selectedVariants: normalizeSelectedVariants(order.selectedVariants),
      paymentStatus: order.paymentStatus,
      status: order.status,
      hasProof: !!order.paymentProofUrl,
      ticketId: order.ticketId,
      orderedAt: order.createdAt,
    }));

    return res.status(200).json({ orders: result, eventTitle: event.title, event });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while fetching orders.' });
  }
}

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

export async function approveOrder(req, res) {
  try {
    const organizerId = req.user._id;
    const { orderId } = req.params;

    const order = await MerchandiseOrder.findById(orderId).populate('event');
    if (!order) return res.status(404).json({ message: 'Order not found.' });

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

    if (event.stock < order.quantity) {
      return res.status(400).json({ message: 'Not enough stock to approve this order.' });
    }

    order.paymentStatus = 'approved';
    order.status = 'confirmed';
    await order.save();

    await MerchandiseEvent.findByIdAndUpdate(event._id, {
      $inc: { stock: -order.quantity, currentRegistrations: order.quantity }
    });

    const qrDataUrl = await QRCode.toDataURL(order.ticketId, { width: 200 });
    const participant = await Participant.findById(order.user).select('email name').lean();

    sendMerchandiseEmail({
      toEmail: participant?.email,
      participantName: participant?.name || 'Customer',
      eventTitle: event.title,
      ticketId: order.ticketId,
      totalPrice: order.totalPrice,
    }).catch((error) => console.error('[email]', error.message));

    return res.status(200).json({
      message: 'Order approved. QR sent to participant.',
      qrDataUrl,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while approving order.' });
  }
}

export async function rejectOrder(req, res) {
  try {
    const organizerId = req.user._id;
    const { orderId } = req.params;

    const order = await MerchandiseOrder.findById(orderId).populate('event', 'organizer title');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!order.event) {
      return res.status(404).json({ message: 'Associated event was not found.' });
    }

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