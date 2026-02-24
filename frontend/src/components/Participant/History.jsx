import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getParticipantDashboardData } from '../../utils/api';
import '../../styles/Dashboard.css';

const CANCELLED_REJECTED_STATUSES = ['cancelled', 'rejected'];

function isUpcomingRecord(record) {
    if (CANCELLED_REJECTED_STATUSES.includes(record.participationStatus)) {
        return false;
    }

    if (record.participationStatus === 'completed') {
        return false;
    }

    if (record.schedule?.endDate && new Date(record.schedule.endDate).getTime() <= Date.now()) {
        return false;
    }

    return true;
}

const ParticipationHistory = () => {
    const navigate = useNavigate();
    const [eventRecords, setEventRecords] = useState([]);
    const [activeHistoryTab, setActiveHistoryTab] = useState('Normal');
    const [loadingData, setLoadingData] = useState(true);
    const [loadError, setLoadError] = useState('');

    const historyTabs = ['Normal', 'Merchandise', 'Completed', 'Cancelled/Rejected'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true);
                const data = await getParticipantDashboardData();
                setEventRecords(data.eventRecords || []);
            } catch (error) {
                setLoadError(error.response?.data?.message || 'Failed to load history.');
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    const activeTabEvents = useMemo(() => {
        const historyRecords = eventRecords.filter((record) => !isUpcomingRecord(record));

        if (activeHistoryTab === 'Normal') {
            return historyRecords.filter((record) => String(record.eventType || '').toLowerCase() === 'normal');
        }

        if (activeHistoryTab === 'Merchandise') {
            return historyRecords.filter((record) => String(record.eventType || '').toLowerCase() === 'merchandise');
        }

        if (activeHistoryTab === 'Completed') {
            return historyRecords.filter((record) => record.participationStatus === 'completed');
        }

        if (activeHistoryTab === 'Cancelled/Rejected') {
            return historyRecords.filter((record) =>
                CANCELLED_REJECTED_STATUSES.includes(record.participationStatus)
            );
        }

        return [];
    }, [eventRecords, activeHistoryTab]);

    return (
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
                        <div
                            key={event.registrationId}
                            className="participant-event-item"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/participant/events/${event.eventId}`)}
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
    );
};

export default ParticipationHistory;
