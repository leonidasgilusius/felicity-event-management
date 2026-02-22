import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OrganizerSidebar from '../../components/OrganizerSidebar';
import EventForum from '../../components/EventForum';
import {
  getOrganizerEventDetail,
  getOrganizerEventFeedback,
  updateOrganizerEvent,
  changeOrganizerEventStatus,
  updateOrganizerEventFormSchema,
  publishOrganizerEvent,
} from '../../utils/api';
import '../../styles/Dashboard.css';
import '../../styles/OrganizerEventDetail.css';

const STATUS_COLORS = {
  draft: '#e67e22', published: '#27ae60', ongoing: '#2980b9',
  completed: '#8e44ad', closed: '#888',
};

const fmt = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';

// ── CSV export ─────────────────────────────────────────────────────────────────
function exportCSV(participants, eventTitle) {
  const header = ['Name', 'Email', 'Registered On', 'Status', 'Payment', 'Ticket ID'];
  const rows = participants.map((p) => [
    `"${p.name}"`,
    `"${p.email}"`,
    `"${fmtDate(p.registeredAt)}"`,
    p.status,
    p.paymentStatus || 'N/A',
    p.ticketId,
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${eventTitle || 'participants'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const OrganizerEventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit form
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editMsg, setEditMsg] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form schema editor
  const [formFields, setFormFields] = useState([]);
  const [newField, setNewField] = useState({
    label: '',
    fieldType: 'text',
    optionsText: '',
    required: false,
  });
  const [formMsg, setFormMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [savingForm, setSavingForm] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Status change
  const [statusMsg, setStatusMsg] = useState('');
  const [statusError, setStatusError] = useState('');

  // Participants table filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Feedback analytics
  const [feedbackStats, setFeedbackStats] = useState({ total: 0, averageRating: 0, ratingBreakdown: [] });
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    getOrganizerEventDetail(eventId)
      .then((d) => {
        setData(d);
        setEditForm({
          description: d.event.description || '',
          registrationDeadline: d.event.registrationDeadline
            ? new Date(d.event.registrationDeadline).toISOString().slice(0, 16)
            : '',
          registrationLimit: d.event.registrationLimit || '',
        });
        const sortedSchema = [...(d.event.formSchema || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setFormFields(sortedSchema.map((field, index) => ({
          label: field.label || '',
          fieldType: field.fieldType || 'text',
          options: Array.isArray(field.options) ? field.options : [],
          required: Boolean(field.required),
          order: Number.isFinite(field.order) ? field.order : index,
        })));
      })
      .catch((e) => setError(e || 'Failed to load event.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [eventId]);

  const loadFeedback = async (rating = null) => {
    setFeedbackLoading(true);
    try {
      const data = await getOrganizerEventFeedback(eventId, rating);
      setFeedbackStats(data.stats || { total: 0, averageRating: 0, ratingBreakdown: [] });
      setFeedbackList(data.feedback || []);
    } catch (e) {
      // keep page functional even if feedback fails
      console.error(e);
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    const numeric = feedbackFilter === 'all' ? null : Number(feedbackFilter);
    loadFeedback(numeric);
  }, [eventId, feedbackFilter]);

  const handleEditSave = async () => {
    setSaving(true);
    setEditError('');
    setEditMsg('');
    try {
      await updateOrganizerEvent(eventId, {
        description: editForm.description,
        registrationDeadline: editForm.registrationDeadline,
        registrationLimit: Number(editForm.registrationLimit),
      });
      setEditMsg('Saved successfully.');
      setEditMode(false);
      load();
    } catch (e) {
      setEditError(e || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Change event status to "${newStatus}"?`)) return;
    setStatusError('');
    setStatusMsg('');
    try {
      await changeOrganizerEventStatus(eventId, newStatus);
      setStatusMsg(`Status changed to "${newStatus}".`);
      load();
    } catch (e) {
      setStatusError(e || 'Failed to change status.');
    }
  };

  const addField = () => {
    if (!newField.label.trim()) return;
    const nextField = {
      label: newField.label.trim(),
      fieldType: newField.fieldType,
      required: newField.required,
      options: newField.fieldType === 'dropdown'
        ? newField.optionsText.split(',').map((o) => o.trim()).filter(Boolean)
        : [],
      order: formFields.length,
    };
    setFormFields((previous) => [...previous, nextField]);
    setNewField({ label: '', fieldType: 'text', optionsText: '', required: false });
  };

  const moveField = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formFields.length) return;
    const nextFields = [...formFields];
    const [movedField] = nextFields.splice(index, 1);
    nextFields.splice(targetIndex, 0, movedField);
    setFormFields(nextFields.map((field, fieldIndex) => ({ ...field, order: fieldIndex })));
  };

  const removeField = (index) => {
    const nextFields = formFields.filter((_, fieldIndex) => fieldIndex !== index);
    setFormFields(nextFields.map((field, fieldIndex) => ({ ...field, order: fieldIndex })));
  };

  const handleSaveFormFields = async () => {
    setSavingForm(true);
    setFormError('');
    setFormMsg('');
    try {
      await updateOrganizerEventFormSchema(eventId, formFields);
      setFormMsg('Form fields saved.');
      load();
    } catch (e) {
      setFormError(e || 'Failed to save form fields.');
    } finally {
      setSavingForm(false);
    }
  };

  const handlePublishDraft = async () => {
    setPublishing(true);
    setFormError('');
    setFormMsg('');
    try {
      await publishOrganizerEvent(eventId);
      setFormMsg('Draft published successfully.');
      load();
    } catch (e) {
      setFormError(e || 'Failed to publish draft.');
    } finally {
      setPublishing(false);
    }
  };

  // Allowed status transitions shown as buttons
  const statusActions = useMemo(() => {
    if (!data) return [];
    const s = data.event.status;
    if (s === 'published') return ['closed'];
    if (s === 'ongoing') return ['completed', 'closed'];
    return [];
  }, [data]);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    if (!data) return [];
    return data.participants.filter((p) => {
      const matchSearch =
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [data, search, statusFilter]);

  if (loading) return (
    <div className="dashboard-container">
      <OrganizerSidebar />
      <div className="dashboard-content"><p>Loading…</p></div>
    </div>
  );

  if (error) return (
    <div className="dashboard-container">
      <OrganizerSidebar />
      <div className="dashboard-content"><p className="error-message">{error}</p></div>
    </div>
  );

  const { event, analytics, participants, displayStatus } = data;
  const isDraft = event.status === 'draft';
  const isPublished = event.status === 'published';
  const isEditable = isDraft || isPublished;

  return (
    <div className="dashboard-container participant-dashboard-container">
      <OrganizerSidebar />
      <div className="dashboard-content participant-dashboard-content oed-content">
        <button className="oed-back-btn" onClick={() => navigate(-1)}>← Back</button>

        {/* ── Overview ── */}
        <div className="oed-card">
          <div className="oed-header">
            <div>
              <h2 className="oed-title">{event.title}</h2>
              <div className="oed-badges">
                <span className="oed-badge oed-type">{event.type}</span>
                <span
                  className="oed-badge oed-status"
                  style={{ background: STATUS_COLORS[event.status] + '22', color: STATUS_COLORS[event.status] }}
                >
                  {displayStatus}
                </span>
              </div>
            </div>
            {isEditable && (
              <button className="oed-edit-toggle" onClick={() => { setEditMode(!editMode); setEditMsg(''); setEditError(''); }}>
                {editMode ? 'Cancel' : 'Edit'}
              </button>
            )}
            {event.type === 'merchandise' && (
              <button
                className="oed-edit-toggle"
                style={{ background: '#1a73e8', color: 'white', borderColor: '#1a73e8' }}
                onClick={() => navigate(`/organizer/events/${eventId}/orders`)}
              >
                Manage Orders
              </button>
            )}
            {event.type === 'normal' && displayStatus === 'Ongoing' && (
              <button
                className="oed-edit-toggle"
                style={{ background: '#27ae60', color: 'white', borderColor: '#27ae60' }}
                onClick={() => navigate(`/organizer/events/${eventId}/attendance`)}
              >
                Attendance
              </button>
            )}
          </div>

          {editMode ? (
            <div className="oed-edit-form">
              <label>Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
              />
              {isPublished && (
                <>
                  <label>Registration Deadline</label>
                  <input
                    type="datetime-local"
                    value={editForm.registrationDeadline}
                    onChange={(e) => setEditForm({ ...editForm, registrationDeadline: e.target.value })}
                  />
                  <label>Registration Limit</label>
                  <input
                    type="number"
                    value={editForm.registrationLimit}
                    onChange={(e) => setEditForm({ ...editForm, registrationLimit: e.target.value })}
                  />
                  <p className="oed-edit-note">Note: For published events you may only extend the deadline and increase the limit.</p>
                </>
              )}
              {editError && <p className="error-message">{editError}</p>}
              <div className="oed-edit-actions">
                <button className="card-button" onClick={handleEditSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <p className="oed-description">{event.description}</p>
          )}

          {editMsg && <p className="oed-success">{editMsg}</p>}

          <div className="oed-meta-grid">
            <div><strong>Type</strong><span>{event.type}</span></div>
            <div><strong>Start</strong><span>{fmt(event.startDate)}</span></div>
            <div><strong>End</strong><span>{fmt(event.endDate)}</span></div>
            <div><strong>Reg. Deadline</strong><span>{fmt(event.registrationDeadline)}</span></div>
            <div><strong>Eligibility</strong><span>{event.eligibility || 'All'}</span></div>
            <div><strong>Fee / Price</strong><span>{event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}</span></div>
            {event.type === 'normal' && (
              <>
                <div><strong>Reg. Limit</strong><span>{event.registrationLimit}</span></div>
                <div><strong>Current Regs.</strong><span>{event.currentRegistrations}</span></div>
                {event.location && <div><strong>Location</strong><span>{event.location}</span></div>}
              </>
            )}
            {event.type === 'merchandise' && (
              <>
                <div><strong>Stock</strong><span>{event.stock}</span></div>
                <div><strong>Max/User</strong><span>{event.maxPerUser}</span></div>
              </>
            )}
          </div>

          {event.eventTags?.length > 0 && (
            <div className="oed-tags">
              {event.eventTags.map((t) => <span key={t} className="oed-tag">{t}</span>)}
            </div>
          )}
        </div>

        {/* ── Analytics ── */}
        <div className="oed-card">
          <h3 className="oed-section-title">Analytics</h3>
          <div className="oed-analytics-grid">
            <div className="oed-stat">
              <span className="oed-stat-value">{analytics.registrations}</span>
              <span className="oed-stat-label">Total Registrations</span>
            </div>
            {event.type === 'merchandise' ? (
              <div className="oed-stat">
                <span className="oed-stat-value">{analytics.sales}</span>
                <span className="oed-stat-label">Approved Sales</span>
              </div>
            ) : null}
            <div className="oed-stat">
              <span className="oed-stat-value">{analytics.attendance}</span>
              <span className="oed-stat-label">Attended</span>
            </div>
            <div className="oed-stat">
              <span className="oed-stat-value">
                {analytics.registrations > 0
                  ? `${Math.round((analytics.attendance / analytics.registrations) * 100)}%`
                  : '—'}
              </span>
              <span className="oed-stat-label">Attendance Rate</span>
            </div>
            {event.type === 'merchandise' && (
              <div className="oed-stat">
                <span className="oed-stat-value">₹{analytics.revenue}</span>
                <span className="oed-stat-label">Revenue</span>
              </div>
            )}
            {event.type === 'normal' && (
              <div className="oed-stat">
                <span className="oed-stat-value">
                  {event.registrationLimit > 0
                    ? `${Math.round((analytics.registrations / event.registrationLimit) * 100)}%`
                    : '—'}
                </span>
                <span className="oed-stat-label">Capacity Filled</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Status Actions ── */}
        {statusActions.length > 0 && (
          <div className="oed-card oed-status-actions">
            <h3 className="oed-section-title">Status Actions</h3>
            <div className="oed-action-btns">
              {statusActions.map((s) => (
                <button
                  key={s}
                  className={`oed-status-btn oed-status-btn-${s}`}
                  onClick={() => handleStatusChange(s)}
                >
                  Mark as {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            {statusMsg && <p className="oed-success">{statusMsg}</p>}
            {statusError && <p className="error-message">{statusError}</p>}
          </div>
        )}

        {/* ── Form Schema (editable until first registration) ── */}
        {(isDraft || isPublished) && (
          <div className="oed-card">
            <h3 className="oed-section-title">Registration Form Schema</h3>
            <p className="oed-edit-note" style={{ marginTop: 0 }}>
              Editable until first registration. After first registration, schema is locked.
            </p>

            <div className="oed-filters" style={{ marginBottom: 10 }}>
              <input
                placeholder="Field label (e.g. Roll Number / Address)"
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
              />
              <select
                className="oed-filter-select"
                value={newField.fieldType}
                onChange={(e) => setNewField({ ...newField, fieldType: e.target.value })}
              >
                <option value="text">Text</option>
                <option value="textarea">Long Text</option>
                <option value="number">Number</option>
                <option value="dropdown">Dropdown</option>
                <option value="checkbox">Checkbox</option>
                <option value="file">File Upload</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                />
                Required
              </label>
            </div>

            {newField.fieldType === 'dropdown' && (
              <input
                className="oed-search"
                placeholder="Dropdown options (comma-separated)"
                value={newField.optionsText}
                onChange={(e) => setNewField({ ...newField, optionsText: e.target.value })}
                style={{ marginBottom: 12 }}
              />
            )}

            <button className="oed-export-btn" onClick={addField} style={{ marginBottom: 14 }}>
              + Add Field
            </button>

            {formFields.length === 0 ? (
              <p className="oed-empty">No fields added yet.</p>
            ) : (
              <div className="oed-table-wrap" style={{ marginBottom: 12 }}>
                <table className="oed-table">
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Type</th>
                      <th>Required</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formFields.map((field, index) => (
                      <tr key={`${field.label}-${index}`}>
                        <td>{field.label}</td>
                        <td>
                          {field.fieldType}
                          {field.options?.length > 0 ? ` [${field.options.join(', ')}]` : ''}
                        </td>
                        <td>{field.required ? 'Yes' : 'No'}</td>
                        <td>
                          <button className="oed-export-btn" onClick={() => moveField(index, 'up')} disabled={index === 0} style={{ marginRight: 6 }}>↑</button>
                          <button className="oed-export-btn" onClick={() => moveField(index, 'down')} disabled={index === formFields.length - 1} style={{ marginRight: 6 }}>↓</button>
                          <button className="oed-status-btn oed-status-btn-closed" onClick={() => removeField(index)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="oed-action-btns">
              <button className="oed-status-btn oed-status-btn-published" onClick={handleSaveFormFields} disabled={savingForm}>
                {savingForm ? 'Saving…' : 'Save Form Fields'}
              </button>
              {isDraft && (
                <button className="oed-status-btn oed-status-btn-ongoing" onClick={handlePublishDraft} disabled={publishing}>
                  {publishing ? 'Publishing…' : 'Publish Draft'}
                </button>
              )}
            </div>
            {formMsg && <p className="oed-success">{formMsg}</p>}
            {formError && <p className="error-message">{formError}</p>}
          </div>
        )}

        {/* ── Participants ── */}
        <div className="oed-card">
          <div className="oed-participants-header">
            <h3 className="oed-section-title">Participants ({participants.length})</h3>
            <button
              className="oed-export-btn"
              onClick={() => exportCSV(participants, event.title)}
              disabled={participants.length === 0}
            >
              Export CSV
            </button>
          </div>

          <div className="oed-filters">
            <input
              className="oed-search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="oed-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="attended">Attended</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
              <option value="shipped">Shipped</option>
            </select>
          </div>

          {filteredParticipants.length === 0 ? (
            <p className="oed-empty">No participants found.</p>
          ) : (
            <div className="oed-table-wrap">
              <table className="oed-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Registered On</th>
                    <th>Status</th>
                    {event.type === 'merchandise' && <th>Qty</th>}
                    {event.type === 'merchandise' && <th>Payment</th>}
                    <th>Ticket ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((p) => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td>{p.email}</td>
                      <td>{fmtDate(p.registeredAt)}</td>
                      <td>
                        <span className={`oed-pstatus oed-pstatus-${p.status}`}>{p.status}</span>
                      </td>
                      {event.type === 'merchandise' && <td>{p.quantity ?? '—'}</td>}
                      {event.type === 'merchandise' && (
                        <td>
                          <span className={`oed-pstatus oed-pay-${p.paymentStatus}`}>
                            {p.paymentStatus || '—'}
                          </span>
                        </td>
                      )}
                      <td className="oed-ticket-id">{p.ticketId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <EventForum eventId={eventId} />

        {event.type === 'normal' && (
          <div className="oed-card">
            <h3 className="oed-section-title">Anonymous Feedback</h3>

            <div className="oed-analytics-grid" style={{ marginBottom: 12 }}>
              <div className="oed-stat">
                <span className="oed-stat-value">{feedbackStats.total || 0}</span>
                <span className="oed-stat-label">Total Feedback</span>
              </div>
              <div className="oed-stat">
                <span className="oed-stat-value">{feedbackStats.averageRating || 0}</span>
                <span className="oed-stat-label">Average Rating</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {['all', 5, 4, 3, 2, 1].map((rating) => (
                <button
                  key={String(rating)}
                  className="oed-export-btn"
                  onClick={() => setFeedbackFilter(String(rating))}
                  style={{
                    background: feedbackFilter === String(rating) ? '#1a73e8' : undefined,
                    color: feedbackFilter === String(rating) ? 'white' : undefined,
                  }}
                >
                  {rating === 'all' ? 'All Ratings' : `${rating}★`}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 10, fontSize: 13, color: '#555' }}>
              {(feedbackStats.ratingBreakdown || []).map((row) => (
                <span key={row.rating} style={{ marginRight: 10 }}>{row.rating}★: {row.count}</span>
              ))}
            </div>

            {feedbackLoading ? (
              <p>Loading feedback…</p>
            ) : feedbackList.length === 0 ? (
              <p className="oed-empty">No feedback available for this filter.</p>
            ) : (
              <div className="oed-table-wrap">
                <table className="oed-table">
                  <thead>
                    <tr>
                      <th>Rating</th>
                      <th>Comment</th>
                      <th>Submitted On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackList.map((item) => (
                      <tr key={item._id}>
                        <td>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</td>
                        <td>{item.comment || '—'}</td>
                        <td>{fmtDate(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerEventDetail;
