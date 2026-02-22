import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ParticipantSidebar from '../../components/ParticipantSidebar';
import {
  getEventDetail, registerForEvent, orderMerchandise,
  unregisterFromEvent, uploadPaymentProof, submitEventFeedback,
} from '../../utils/participantApi';
import EventForum from '../../components/EventForum';
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
  const [ticket, setTicket] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [unregistering, setUnregistering] = useState(false);
  const [unregisterError, setUnregisterError] = useState('');

  // Payment proof upload (merchandise)
  const [proofFile, setProofFile] = useState(null);
  const [proofLink, setProofLink] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Anonymous feedback (attended normal events only)
  const [feedbackMeta, setFeedbackMeta] = useState({ canSubmit: false, hasSubmitted: false, existing: null });
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    getEventDetail(id)
      .then((data) => {
        setEvent(data.event);
        setAlreadyRegistered(data.alreadyRegistered);
        if (data.existingTicket) setTicket(data.existingTicket);
        if (data.feedback) setFeedbackMeta(data.feedback);
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
        const responses = (event.formSchema || []).map((field) => ({
          label: field.label,
          answer: formResponses[field.label] ?? '',
        }));
        result = await orderMerchandise(id, { quantity, selectedVariants, formResponses: responses });
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

  const handleUploadProof = async () => {
    if (!proofFile && !proofLink.trim()) return;
    setUploading(true);
    setUploadMsg('');
    setUploadError('');
    try {
      const trimmedLink = proofLink.trim();

      if (trimmedLink) {
        await uploadPaymentProof(id, { paymentProofUrl: trimmedLink });
      } else {
        const maxSizeBytes = 2 * 1024 * 1024;
        if (proofFile.size > maxSizeBytes) {
          throw new Error('Image is too large. Use an image up to 2MB or paste a Drive link.');
        }

        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(proofFile);
        });
        await uploadPaymentProof(id, { paymentProofDataUrl: dataUrl });
      }

      setUploadMsg('Payment proof uploaded! Awaiting organizer approval.');
      setProofFile(null);
      setProofLink('');
      setTicket((prev) => ({ ...prev, hasProof: true, paymentStatus: 'pending_approval' }));
    } catch (err) {
      setUploadError(err || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackMsg('');

    if (feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackError('Please select a rating between 1 and 5.');
      return;
    }

    setFeedbackSubmitting(true);
    try {
      const res = await submitEventFeedback(id, { rating: feedbackRating, comment: feedbackComment });
      setFeedbackMsg(res.message || 'Feedback submitted.');
      setFeedbackMeta({
        canSubmit: false,
        hasSubmitted: true,
        existing: {
          rating: feedbackRating,
          comment: feedbackComment,
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      setFeedbackError(err || 'Failed to submit feedback.');
    } finally {
      setFeedbackSubmitting(false);
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
              {/* ── Merchandise: payment workflow ── */}
              {event.type === 'merchandise' ? (
                <>
                  <div className="ed-ticket-details">
                    <div><strong>Order ID</strong><span className="ed-ticket-id">{ticket.ticketId}</span></div>
                    <div><strong>Item</strong><span>{ticket.eventTitle}</span></div>
                    {ticket.totalPrice != null && <div><strong>Total</strong><span>₹{ticket.totalPrice}</span></div>}
                  </div>

                  {ticket.paymentStatus === 'approved' ? (
                    <>
                      <p className="ed-success">✓ {ticket.message}</p>
                      <p className="ed-qr-label">Show this QR code when collecting your item:</p>
                      <img src={ticket.qrDataUrl} alt="Order QR" className="ed-qr-img" />
                      <p className="ed-qr-note">A confirmation has also been sent to your email.</p>
                    </>
                  ) : ticket.paymentStatus === 'rejected' ? (
                    <>
                      <p className="ed-blocked" style={{ color: '#c0392b' }}>
                        ✗ Your payment proof was rejected. Please re-upload a valid proof.
                      </p>
                      <div className="ed-proof-upload">
                        <label className="ed-proof-label">Re-upload Payment Proof</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => { setProofFile(e.target.files[0]); setUploadMsg(''); setUploadError(''); }}
                          className="ed-proof-input"
                        />
                        <p style={{ fontSize: 12, color: '#888', margin: '4px 0' }}>or paste a share link (Google Drive/Dropbox/Cloudinary)</p>
                        <input
                          type="url"
                          value={proofLink}
                          onChange={(e) => { setProofLink(e.target.value); setUploadMsg(''); setUploadError(''); }}
                          placeholder="https://drive.google.com/..."
                          className="ed-proof-input"
                        />
                        {uploadError && <p className="error-message">{uploadError}</p>}
                        {uploadMsg && <p className="ed-success">{uploadMsg}</p>}
                        <button
                          className="ed-submit-btn"
                          onClick={handleUploadProof}
                          disabled={(!proofFile && !proofLink.trim()) || uploading}
                        >
                          {uploading ? 'Uploading…' : 'Submit Proof'}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* pending_approval */
                    ticket.hasProof ? (
                      <>
                        <p className="ed-pending-badge">⏳ Awaiting organizer approval</p>
                        <p style={{ fontSize: 13, color: '#666' }}>
                          Your payment proof has been submitted. You will receive a QR code by email once approved.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="ed-success">{ticket.message}</p>
                        <div className="ed-proof-upload">
                          <label className="ed-proof-label">Upload Payment Proof <span className="ed-required">*</span></label>
                          <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
                            Upload a screenshot/photo up to 2MB or paste a share link.
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => { setProofFile(e.target.files[0]); setUploadMsg(''); setUploadError(''); }}
                            className="ed-proof-input"
                          />
                          <p style={{ fontSize: 12, color: '#888', margin: '4px 0' }}>
                            Link instructions: set Drive access to “Anyone with the link can view”, then paste below.
                          </p>
                          <input
                            type="url"
                            value={proofLink}
                            onChange={(e) => { setProofLink(e.target.value); setUploadMsg(''); setUploadError(''); }}
                            placeholder="https://drive.google.com/..."
                            className="ed-proof-input"
                          />
                          {uploadError && <p className="error-message">{uploadError}</p>}
                          {uploadMsg && <p className="ed-success">{uploadMsg}</p>}
                          <button
                            className="ed-submit-btn"
                            onClick={handleUploadProof}
                            disabled={(!proofFile && !proofLink.trim()) || uploading}
                            style={{ marginTop: 10 }}
                          >
                            {uploading ? 'Uploading…' : 'Submit Payment Proof'}
                          </button>
                        </div>
                      </>
                    )
                  )}
                </>
              ) : (
                /* ── Normal event ticket ── */
                <>
                  <p className="ed-success">{ticket.message}</p>
                  <div className="ed-ticket-details">
                    <div><strong>Ticket ID</strong><span className="ed-ticket-id">{ticket.ticketId}</span></div>
                    <div><strong>Event</strong><span>{ticket.eventTitle}</span></div>
                    {ticket.registrationFee > 0 && <div><strong>Fee</strong><span>₹{ticket.registrationFee}</span></div>}
                  </div>
                  <p className="ed-qr-label">Show this QR code at the entrance:</p>
                  <img src={ticket.qrDataUrl} alt="Ticket QR" className="ed-qr-img" />
                  <p className="ed-qr-note">A copy has also been sent to your email.</p>
                  {!['ongoing', 'completed', 'closed'].includes(event.status) && (
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
                </>
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

                  {/* Extra form fields defined by organizer */}
                  {(event.formSchema || []).map((field) => (
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
                  {event.paymentDetails && (
                    <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 8 }}>
                      <strong>Payment details:</strong>
                      <pre style={{ margin: '4px 0 0', fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>{event.paymentDetails}</pre>
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: '#888', margin: '-4px 0 8px' }}>
                    You will be asked to upload a screenshot of your payment after placing the order.
                  </p>
                </>
              )}

              {submitError && <p className="error-message">{submitError}</p>}
              <button type="submit" className="ed-submit-btn" disabled={submitting}>
                {submitting ? 'Processing…' : event.type === 'merchandise' ? 'Place Order' : 'Register'}
              </button>
            </form>
          )}
        </div>

        <EventForum eventId={id} />

        {event.type === 'normal' && (
          <div className="ed-card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Anonymous Feedback</h3>
            <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
              Feedback opens after your attendance is marked via QR scan. Organizer sees aggregated anonymous ratings/comments.
            </p>

            {feedbackMeta.hasSubmitted && feedbackMeta.existing ? (
              <div style={{ background: '#f7f8fb', border: '1px solid #e6eaf2', borderRadius: 8, padding: 12 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>You already submitted feedback.</p>
                <p style={{ margin: '6px 0 0' }}>Rating: {'★'.repeat(feedbackMeta.existing.rating)}{'☆'.repeat(5 - feedbackMeta.existing.rating)}</p>
                {feedbackMeta.existing.comment && <p style={{ margin: '6px 0 0' }}>{feedbackMeta.existing.comment}</p>}
              </div>
            ) : feedbackMeta.canSubmit ? (
              <form onSubmit={handleSubmitFeedback}>
                <label style={{ display: 'block', marginBottom: 6 }}>Rating</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 24,
                        cursor: 'pointer',
                        color: star <= feedbackRating ? '#f39c12' : '#bbb',
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <label style={{ display: 'block', marginBottom: 6 }}>Comment (optional)</label>
                <textarea
                  rows={3}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Share your experience (anonymous)..."
                  style={{ width: '100%' }}
                />

                {feedbackError && <p className="error-message" style={{ marginTop: 8 }}>{feedbackError}</p>}
                {feedbackMsg && <p style={{ color: '#27ae60', fontWeight: 600, marginTop: 8 }}>{feedbackMsg}</p>}

                <button type="submit" className="ed-submit-btn" disabled={feedbackSubmitting} style={{ marginTop: 10 }}>
                  {feedbackSubmitting ? 'Submitting…' : 'Submit Anonymous Feedback'}
                </button>
              </form>
            ) : (
              <p style={{ color: '#777', marginBottom: 0 }}>
                You can submit feedback once attendance is marked as present.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
