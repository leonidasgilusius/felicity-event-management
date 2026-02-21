import { useEffect, useState } from 'react';
import OrganizerSidebar from '../../components/OrganizerSidebar';
import { getOrganizerDashboardData } from '../../utils/api';
import '../../styles/Dashboard.css';

const OngoingEvents = () => {
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getOrganizerDashboardData();
        setOngoingEvents(data.ongoingEvents || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="dashboard-container participant-dashboard-container">
      <OrganizerSidebar />
      <div className="dashboard-content participant-dashboard-content">
        <section className="info-section participant-section">
          <h3>Ongoing Events</h3>
          {loading ? (
            <p>Loading...</p>
          ) : ongoingEvents.length === 0 ? (
            <p>No ongoing events.</p>
          ) : (
            <div className="organizer-list">
              {ongoingEvents.map((event) => (
                <div key={event._id} className="organizer-item">
                  <div>
                    <strong>{event.name}</strong>
                    <div>Total Registrations: {event.registrationsCount || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default OngoingEvents;
