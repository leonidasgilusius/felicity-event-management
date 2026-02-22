import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OrganizerSidebar from '../../components/OrganizerSidebar';
import {
  getOrganizerEventDetail,
  updateOrganizerEvent,
  changeOrganizerEventStatus,
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

  // Status change
  const [statusMsg, setStatusMsg] = useState('');
  const [statusError, setStatusError] = useState('');

  // Participants table filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
      })
      .catch((e) => setError(e || 'Failed to load event.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [eventId]);

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
      </div>
    </div>
  );
};

export default OrganizerEventDetail;
