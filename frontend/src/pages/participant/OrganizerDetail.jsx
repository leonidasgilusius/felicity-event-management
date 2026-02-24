import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ParticipantSidebar from '../../components/Participant/ParticipantSidebar';
import { getOrganizerDetail, toggleFollowOrganizer } from '../../utils/participantApi';
import { getErrorMessage } from '../../utils/api';
import '../../styles/Dashboard.css';
import '../../styles/Organizers.css';

const OrganizerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getOrganizerDetail(id)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load organizer.')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollow = async () => {
    try {
      const res = await toggleFollowOrganizer(id);
      setData((prev) => ({ ...prev, organizer: { ...prev.organizer, isFollowed: res.isFollowed } }));
    } catch {}
  };

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <div className="dashboard-container"><ParticipantSidebar /><div className="dashboard-content"><p>Loading…</p></div></div>;
  if (error) return <div className="dashboard-container"><ParticipantSidebar /><div className="dashboard-content"><p className="error-message">{error}</p></div></div>;

  const { organizer, upcoming, past } = data;

  return (
    <div className="dashboard-container">
      <ParticipantSidebar />
      <div className="dashboard-content org-detail-content">
        <button className="ed-back-btn" onClick={() => navigate('/participant/organizers')}>← Back</button>

        <div className="pp-card org-detail-header">
          <div>
            <h2>{organizer.name}</h2>
            {organizer.category && <span className="org-category">{organizer.category}</span>}
            {organizer.email && <p className="org-email">✉ {organizer.email}</p>}
            {organizer.description && <p className="org-detail-desc">{organizer.description}</p>}
          </div>
          <button
            className={`org-follow-btn ${organizer.isFollowed ? 'following' : ''}`}
            onClick={handleFollow}
          >
            {organizer.isFollowed ? 'Unfollow' : 'Follow'}
          </button>
        </div>

        <div className="pp-card">
          <h3>Upcoming Events</h3>
          {upcoming.length === 0 ? (
            <p style={{ color: '#888' }}>No upcoming events.</p>
          ) : (
            <div className="org-event-list">
              {upcoming.map((ev) => (
                <div key={ev._id} className="org-event-item" onClick={() => navigate(`/participant/events/${ev._id}`)}>
                  <strong>{ev.title}</strong>
                  <span>{fmt(ev.startDate)} – {fmt(ev.endDate)}</span>
                  <span className="org-event-type">{ev.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {past.length > 0 && (
          <div className="pp-card">
            <h3>Past Events</h3>
            <div className="org-event-list past">
              {past.map((ev) => (
                <div key={ev._id} className="org-event-item">
                  <strong>{ev.title}</strong>
                  <span>{fmt(ev.startDate)} – {fmt(ev.endDate)}</span>
                  <span className="org-event-type">{ev.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDetail;
