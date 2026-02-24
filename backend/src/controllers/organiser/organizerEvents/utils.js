export const ALLOWED_EVENT_CATEGORIES = [
  'Technology',
  'Music',
  'Sports',
  'Art',
  'Science',
  'Literature',
  'Gaming',
  'Film',
  'Dance',
  'Food'
];

export function normalizeEligibility(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'ALL') return 'All';
  if (normalized === 'IIIT') return 'IIIT';
  return null;
}

export function normalizeEventTags(eventTags) {
  if (!Array.isArray(eventTags)) return [];

  return [...new Set(
    eventTags
      .map((tag) => String(tag || '').trim())
      .filter(Boolean)
      .filter((tag) => ALLOWED_EVENT_CATEGORIES.includes(tag))
  )];
}

function parseEventDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateEventTimeline({ startDate, endDate, registrationDeadline }) {
  const parsedStartDate = parseEventDate(startDate);
  const parsedEndDate = parseEventDate(endDate);
  const parsedRegistrationDeadline = parseEventDate(registrationDeadline);

  if (!parsedStartDate || !parsedEndDate || !parsedRegistrationDeadline) {
    return 'Invalid event dates provided.';
  }

  if (parsedEndDate <= parsedStartDate) {
    return 'End date must be after start date.';
  }

  if (parsedRegistrationDeadline >= parsedEndDate) {
    return 'Registration deadline must be before end date.';
  }

  return null;
}

export function getDisplayStatus(event) {
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

export function getEventAnalytics(event, registrations) {
  return {
    registrations: registrations.length,
    sales: registrations.filter((registration) => registration.type === 'order' && registration.paymentStatus === 'approved').length,
    revenue: getEventRevenue(event, registrations),
    attendance: registrations.filter((registration) => registration.status === 'attended').length
  };
}

export function normalizeFormFields(fields = []) {
  return fields.map((field, index) => ({
    label: String(field.label || '').trim(),
    fieldType: String(field.fieldType || '').trim().toLowerCase(),
    options: Array.isArray(field.options) ? field.options.map((option) => String(option).trim()).filter(Boolean) : [],
    required: Boolean(field.required),
    order: Number.isFinite(field.order) ? field.order : index
  }));
}

export function validateFormFields(fields) {
  const allowedTypes = ['text', 'number', 'file', 'dropdown', 'checkbox'];

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

export function isEventHappeningNow(event) {
  const now = new Date();
  if (!event?.startDate || !event?.endDate) return false;
  return now >= new Date(event.startDate) && now <= new Date(event.endDate);
}

export function normalizeSelectedVariants(value) {
  if (!value) return {};
  if (typeof value.entries === 'function') return Object.fromEntries(value.entries());
  if (Array.isArray(value)) return Object.fromEntries(value);
  if (typeof value === 'object') return value;
  return {};
}

export function formatAttendanceParticipants(registrations) {
  return registrations.map((registration) => ({
    registrationId: registration._id,
    participantId: registration.user?._id || null,
    name: registration.user?.name || 'Unknown',
    email: registration.user?.email || '',
    ticketId: registration.ticketId,
    status: registration.status,
    checkInTime: registration.checkInTime || null,
    scanned: registration.status === 'attended',
    quantity: registration.quantity ?? null,
    paymentStatus: registration.paymentStatus || null,
    selectedVariants: normalizeSelectedVariants(registration.selectedVariants),
  }));
}