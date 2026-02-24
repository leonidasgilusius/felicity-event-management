import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getParticipantDashboardData, getErrorMessage } from '../../utils/api';
import ParticipantSidebar from '../../components/Participant/ParticipantSidebar';
import '../../styles/Dashboard.css';

import ParticipationHistory from '../../components/Participant/History';

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchParticipantData = async () => {
      try {
        setLoadingData(true);
        const data = await getParticipantDashboardData();
        setUpcomingEvents(data.upcomingEvents || []);
      } catch (error) {
        setLoadError(getErrorMessage(error, 'Failed to load dashboard.'));
      } finally {
        setLoadingData(false);
      }
    };
    fetchParticipantData();
  }, []);

  const openEventDetails = (eventId) => {
    navigate(`/participant/events/${eventId}`);
  };

  return (
    <div className="dashboard-container participant-dashboard-container">
      <ParticipantSidebar />
      <div className="dashboard-content participant-dashboard-content">
        <div className="welcome-section">
          <h2>Welcome, {user?.name || user?.firstName}!</h2>
          <p className="role-badge participant">Participant</p>
        </div>

        <section className="info-section participant-section">
          <h3>Upcoming Events</h3>
          {loadingData ? (
            <p>Loading...</p>
          ) : loadError ? (
            <p className="error-message">{loadError}</p>
          ) : upcomingEvents.length === 0 ? (
            <p>No upcoming events.</p>
          ) : (
            <div className="participant-event-list">
              {upcomingEvents.map((event) => (
                <div
                  key={event.registrationId}
                  className="participant-event-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openEventDetails(event.eventId)}
                >
                  <div className="participant-event-item-header">
                    <strong>{event.eventName}</strong>
                    <span>Type: {event.eventType}</span>
                    <span>Organizer: {event.organizer}</span>
                    <span>Status: {event.participationStatus}</span>
                    <span>Ticket ID: {event.ticketId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        < ParticipationHistory />
      </div>
    </div>
  );
};

export default ParticipantDashboard;
