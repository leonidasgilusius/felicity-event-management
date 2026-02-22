import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getOrganizerDashboardData } from '../../utils/api';
import OrganizerSidebar from '../../components/OrganizerSidebar';
import '../../styles/Dashboard.css';

const OrganizerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState({
        events: [],
        totalEventAnalytics: { registrations: 0, sales: 0, revenue: 0, attendance: 0 }
    });
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const selectedEvent = useMemo(
        () => dashboardData.events.find((event) => event._id === selectedEventId) || null,
        [dashboardData.events, selectedEventId]
    );

    const loadOrganizerDashboard = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getOrganizerDashboardData();
            setDashboardData({
                events: data.events || [],
                totalEventAnalytics: data.totalEventAnalytics || { registrations: 0, sales: 0, revenue: 0, attendance: 0 }
            });
            if (data.events?.length) {
                setSelectedEventId(data.events[0]._id);
            }
        } catch (fetchError) {
            setError(fetchError.response?.data?.message || 'Failed to load organizer dashboard.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrganizerDashboard();
    }, []);

    const renderAnalytics = (analytics) => (
        <div className="organizer-analytics-grid">
            <div className="info-item"><strong>Registrations</strong>{analytics.registrations}</div>
            <div className="info-item"><strong>Sales</strong>{analytics.sales}</div>
            <div className="info-item"><strong>Revenue</strong>₹{analytics.revenue}</div>
            <div className="info-item"><strong>Attendance</strong>{analytics.attendance}</div>
        </div>
    );

    return (
        <div className="dashboard-container participant-dashboard-container">
            <OrganizerSidebar />
            <div className="dashboard-content participant-dashboard-content">
                <div className="welcome-section">
                    <h2>Welcome, {user?.name}!</h2>
                    <p className="role-badge organizer">Organizer</p>
                </div>

                {loading ? (
                    <p>Loading...</p>
                ) : error ? (
                    <p className="error-message">{error}</p>
                ) : (
                    <>
                        <section className="info-section participant-section">
                            <h3>Events Carousel</h3>
                            {dashboardData.events.length === 0 ? (
                                <p>No events created yet.</p>
                            ) : (
                                <div className="organizer-carousel">
                                    {dashboardData.events.map((event) => (
                                        <div key={event._id} className="organizer-event-card">
                                            <h4>{event.name}</h4>
                                            <p>Type: {event.type}</p>
                                            <p>Status: {event.status}</p>
                                            <button
                                                type="button"
                                                className={`card-button ${selectedEventId === event._id ? 'active' : ''}`}
                                                onClick={() => navigate(`/organizer/events/${event._id}`)}
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="info-section participant-section">
                            <h3>Event Analytics</h3>
                            {!selectedEvent ? <p>Select an event from the carousel.</p> : renderAnalytics(selectedEvent.analytics)}
                        </section>

                        <section className="info-section participant-section">
                            <h3>Total Event Analytics (Completed Events)</h3>
                            {renderAnalytics(dashboardData.totalEventAnalytics)}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default OrganizerDashboard;
