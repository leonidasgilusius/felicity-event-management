import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ParticipantSidebar from '../../components/ParticipantSidebar';
import { getEventDetail, registerForEvent, orderMerchandise, unregisterFromEvent } from '../../utils/participantApi';
import '../../styles/Dashboard.css';
import '../../styles/EventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // For normal event form responses
  const [formResponses, setFormResponses] = useState({});
  // For merchandise
  const [selectedVariants, setSelectedVariants] = useState({});
  const [quantity, setQuantity] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState(null); // { ticketId, qrDataUrl, message, totalPrice, registrationFee }
  const [submitError, setSubmitError] = useState('');
  const [unregistering, setUnregistering] = useState(false);
  const [unregisterError, setUnregisterError] = useState('');

  useEffect(() => {
    getEventDetail(id)
      .then((data) => {
        setEvent(data.event);
        setAlreadyRegistered(data.alreadyRegistered);
        if (data.existingTicket) setTicket(data.existingTicket);
      })
      .catch((err) => setError(err || 'Failed to load event.'))
      .finally(() => setLoading(false));
  }, [id]);

  const fmt = (d) =>
    d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  // ── Blocking checks ───────────────────────────────────────────────────────
  const getBlockReason = () => {
    if (!event) return null;
    if (alreadyRegistered) return 'already';
    if (['closed', 'completed', 'draft'].includes(event.status)) return 'closed';
    if (new Date(event.registrationDeadline) < new Date()) return 'deadline';
    if (event.type === 'merchandise' && event.stock <= 0) return 'stock';
    if (event.type === 'normal' && event.currentRegistrations >= event.registrationLimit) return 'limit';
    return null;
  };

  const blockReason = getBlockReason();

  const blockMessages = {
    already: 'You are already registered for this event.',
    closed: 'Registrations are closed for this event.',
    deadline: 'The registration deadline has passed.',
    stock: 'This item is out of stock.',
    limit: 'The registration limit has been reached.',
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      let result;
      if (event.type === 'merchandise') {
        result = await orderMerchandise(id, { quantity, selectedVariants });
      } else {
        const responses = (event.formSchema || []).map((field) => ({
          label: field.label,
          answer: formResponses[field.label] ?? '',
        }));
        result = await registerForEvent(id, responses);
      }
      setTicket(result);
      setAlreadyRegistered(true);
    } catch (err) {
      setSubmitError(err || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnregister = async () => {
    if (!window.confirm('Are you sure you want to unregister from this event?')) return;
    setUnregistering(true);
    setUnregisterError('');
    try {
      await unregisterFromEvent(id);
      setAlreadyRegistered(false);
      setTicket(null);
    } catch (err) {
      setUnregisterError(err || 'Failed to unregister.');
    } finally {
      setUnregistering(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div className="dashboard-container"><ParticipantSidebar /><div className="dashboard-content"><p>Loading…</p></div></div>;
  if (error) return <div className="dashboard-container"><ParticipantSidebar /><div className="dashboard-content"><p className="error-message">{error}</p></div></div>;
  if (!event) return null;

  return (
    <div className="dashboard-container">
      <ParticipantSidebar />
      <div className="dashboard-content event-details-content">
        <button className="ed-back-btn" onClick={() => navigate(-1)}>← Back</button>

        {event.image && <img src={event.image} alt={event.title} className="ed-hero-img" />}

        <div className="ed-card">
          <div className="ed-header">
            <h2>{event.title}</h2>
            <span className={`ed-type-badge ed-type-${event.type}`}>{event.type}</span>
          </div>

          <p className="ed-description">{event.description}</p>

          <div className="ed-meta-grid">
            <div><strong>Organizer</strong><span>{event.organizer?.name}</span></div>
            <div><strong>Category</strong><span>{event.organizer?.category || '—'}</span></div>
            <div><strong>Starts</strong><span>{fmt(event.startDate)}</span></div>
            <div><strong>Ends</strong><span>{fmt(event.endDate)}</span></div>
            <div><strong>Eligibility</strong><span>{event.eligibility}</span></div>
            <div><strong>Status</strong><span className={`ed-status ed-status-${event.status}`}>{event.status}</span></div>
            {event.type === 'normal' && (
              <>
                <div><strong>Location</strong><span>{event.location || '—'}</span></div>
                <div><strong>Fee</strong><span>{event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}</span></div>
                <div><strong>Spots left</strong><span>{event.registrationLimit - event.currentRegistrations} / {event.registrationLimit}</span></div>
                <div><strong>Reg. deadline</strong><span>{fmt(event.registrationDeadline)}</span></div>
              </>
            )}
            {event.type === 'merchandise' && (
              <>
                <div><strong>Price</strong><span>₹{event.registrationFee}</span></div>
                <div><strong>Stock left</strong><span>{event.stock}</span></div>
                <div><strong>Max per user</strong><span>{event.maxPerUser}</span></div>
                <div><strong>Order deadline</strong><span>{fmt(event.registrationDeadline)}</span></div>
              </>
            )}
          </div>

          {event.eventTags?.length > 0 && (
            <div className="ed-tags">
              {event.eventTags.map((t) => <span key={t} className="browse-tag">{t}</span>)}
            </div>
          )}
        </div>

        {/* ── Action section ─── */}
        <div className="ed-card">
          {ticket ? (
            <div className="ed-ticket">
              <p className="ed-success">{ticket.message}</p>
              <div className="ed-ticket-details">
                <div><strong>Ticket / Order ID</strong><span className="ed-ticket-id">{ticket.ticketId}</span></div>
                <div><strong>Event</strong><span>{ticket.eventTitle}</span></div>
                {ticket.totalPrice != null && <div><strong>Amount Paid</strong><span>₹{ticket.totalPrice}</span></div>}
                {ticket.registrationFee > 0 && ticket.totalPrice == null && <div><strong>Fee</strong><span>₹{ticket.registrationFee}</span></div>}
              </div>
              <p className="ed-qr-label">Show this QR code at the entrance:</p>
              <img src={ticket.qrDataUrl} alt="Ticket QR" className="ed-qr-img" />
              <p className="ed-qr-note">A copy has also been sent to your email.</p>
              {event.type === 'normal' && !['ongoing', 'completed', 'closed'].includes(event.status) && (
                <div className="ed-unregister-section">
                  <button
                    className="ed-unregister-btn"
                    onClick={handleUnregister}
                    disabled={unregistering}
                  >
                    {unregistering ? 'Unregistering…' : 'Unregister from Event'}
                  </button>
                  {unregisterError && <p className="error-message">{unregisterError}</p>}
                </div>
              )}
            </div>
          ) : blockReason ? (
            <p className="ed-blocked">{blockMessages[blockReason]}</p>
          ) : (
            <form onSubmit={handleSubmit} className="ed-form">
              <h3>{event.type === 'merchandise' ? 'Purchase' : 'Register'}</h3>

              {/* Normal event: dynamic form */}
              {event.type === 'normal' && (event.formSchema || []).map((field) => (
                <div key={field.label} className="ed-field">
                  <label>{field.label}{field.required && <span className="ed-required">*</span>}</label>
                  {field.fieldType === 'textarea' ? (
                    <textarea
                      required={field.required}
                      value={formResponses[field.label] || ''}
                      onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })}
                    />
                  ) : field.fieldType === 'dropdown' ? (
                    <select
                      required={field.required}
                      value={formResponses[field.label] || ''}
                      onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.fieldType === 'number' ? 'number' : 'text'}
                      required={field.required}
                      value={formResponses[field.label] || ''}
                      onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })}
                    />
                  )}
                </div>
              ))}

              {/* Merchandise: variants + quantity */}
              {event.type === 'merchandise' && (
                <>
                  {(event.variants || []).map((v) => (
                    <div key={v.name} className="ed-field">
                      <label>{v.name}</label>
                      <select
                        value={selectedVariants[v.name] || ''}
                        onChange={(e) => setSelectedVariants({ ...selectedVariants, [v.name]: e.target.value })}
                      >
                        <option value="">Select…</option>
                        {Object.keys(v.details || {}).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <div className="ed-field">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min={1}
                      max={event.maxPerUser}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>
                  <p className="ed-total">Total: ₹{event.registrationFee * quantity}</p>
                </>
              )}

              {submitError && <p className="error-message">{submitError}</p>}
              <button type="submit" className="ed-submit-btn" disabled={submitting}>
                {submitting ? 'Processing…' : event.type === 'merchandise' ? 'Place Order' : 'Register'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
