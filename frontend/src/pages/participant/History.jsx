import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getParticipantDashboardData } from '../../utils/api';
import ParticipantSidebar from '../../components/ParticipantSidebar';
import '../../styles/Dashboard.css';

const ParticipationHistory = () => {
    const { user } = useAuth();
    const [participationHistory, setParticipationHistory] = useState({
        Normal: [],
        Merchandise: [],
        Completed: [],
        'Cancelled/Rejected': []
    });
    const [activeHistoryTab, setActiveHistoryTab] = useState('Normal');
    const [expandedRecordId, setExpandedRecordId] = useState(null);
    const [loadingData, setLoadingData] = useState(true);
    const [loadError, setLoadError] = useState('');

    const historyTabs = ['Normal', 'Merchandise', 'Completed', 'Cancelled/Rejected'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true);
                const data = await getParticipantDashboardData();
                setParticipationHistory(data.participationHistory || {
                    Normal: [],
                    Merchandise: [],
                    Completed: [],
                    'Cancelled/Rejected': []
                });
            } catch (error) {
                setLoadError(error.response?.data?.message || 'Failed to load history.');
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    const activeTabEvents = useMemo(
        () => participationHistory[activeHistoryTab] || [],
        [participationHistory, activeHistoryTab]
    );

    const toggleEventRecord = (recordId) => {
        setExpandedRecordId((prevId) => (prevId === recordId ? null : recordId));
    };

    const handleTicketClick = (ticketId) => {
        window.alert(`Ticket ID: ${ticketId}`);
    };

    const renderRecordDetails = (event) => {
        if (expandedRecordId !== event.registrationId) return null;
        return (
            <div className="participant-event-record">
                <p><strong>Event Name:</strong> {event.eventName}</p>
                <p><strong>Event Type:</strong> {event.eventType}</p>
                <p><strong>Organizer:</strong> {event.organizer}</p>
                <p><strong>Status:</strong> {event.participationStatus}</p>
                <p><strong>Team Name:</strong> {event.teamName || 'N/A'}</p>
                <p>
                    <strong>Ticket ID:</strong>{' '}
                    <button type="button" className="participant-ticket-link" onClick={() => handleTicketClick(event.ticketId)}>
                        {event.ticketId}
                    </button>
                </p>
            </div>
        );
    };

    return (
        <div className="dashboard-container participant-dashboard-container">
            <ParticipantSidebar />
            <div className="dashboard-content participant-dashboard-content">
                <section className="info-section participant-section">
                    <h3>Participation History</h3>
                    <div className="participant-tabs" role="tablist" aria-label="Participation categories">
                        {historyTabs.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                className={`participant-tab ${activeHistoryTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveHistoryTab(tab)}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {loadingData ? (
                        <p>Loading...</p>
                    ) : loadError ? (
                        <p className="error-message">{loadError}</p>
                    ) : activeTabEvents.length === 0 ? (
                        <p>No records in this category.</p>
                    ) : (
                        <div className="participant-event-list">
                            {activeTabEvents.map((event) => (
                                <div key={event.registrationId} className="participant-event-item">
                                    <button
                                        type="button"
                                        className="participant-event-item-header"
                                        onClick={() => toggleEventRecord(event.registrationId)}
                                    >
                                        <strong>{event.eventName}</strong>
                                        <span>Status: {event.participationStatus}</span>
                                        <span>Ticket ID: {event.ticketId}</span>
                                    </button>
                                    {renderRecordDetails(event)}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ParticipationHistory;
