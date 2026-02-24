import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganizerSidebar from '../../components/Organizer/OrganizerSidebar';
import { getOrganizerDashboardData } from '../../utils/api';
import '../../styles/Dashboard.css';

const STATUS_COLORS = {
  Draft: '#e67e22', Published: '#27ae60', Ongoing: '#2980b9',
  Completed: '#8e44ad', Closed: '#888',
};

const OngoingEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getOrganizerDashboardData();
        setEvents(data.events || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const statuses = ['all', 'Draft', 'Published', 'Ongoing', 'Completed', 'Closed'];
  const filtered = filter === 'all' ? events : events.filter((e) => e.status === filter);

  return (
    <div className="dashboard-container participant-dashboard-container">
      <OrganizerSidebar />
      <div className="dashboard-content participant-dashboard-content">
        <section className="info-section participant-section">
          <h3>My Events</h3>

          <div className="participant-tabs" style={{ marginBottom: 18 }}>
            {statuses.map((s) => (
              <button
                key={s}
                className={`participant-tab${filter === s ? ' active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>

          {loading ? (
            <p>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: '#888' }}>No events found.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {filtered.map((event) => (
                <button
                  key={event._id}
                  onClick={() => navigate(`/organizer/events/${event._id}`)}
                  style={{
                    background: 'white', border: '1px solid #d9e0ec', borderRadius: 10,
                    padding: '16px 20px', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 12, transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(102,126,234,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d9e0ec';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    <strong style={{ color: '#1a1a2e', fontSize: 15 }}>{event.name}</strong>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                      {event.type} · Registrations: {event.analytics?.registrations ?? 0}
                      {event.analytics?.revenue > 0 && ` · ₹${event.analytics.revenue} revenue`}
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: (STATUS_COLORS[event.status] || '#888') + '22',
                    color: STATUS_COLORS[event.status] || '#888',
                    flexShrink: 0,
                  }}>
                    {event.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default OngoingEvents;
