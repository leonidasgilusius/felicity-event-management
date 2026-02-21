import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticipantSidebar from '../../components/ParticipantSidebar';
import { getBrowseEvents } from '../../utils/participantApi';
import '../../styles/Dashboard.css';
import '../../styles/BrowseEvents.css';

function fuzzyScore(needle, haystack) {
  if (!needle) return 1;
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  if (h.includes(n)) return 1; 

  let ni = 0;
  let score = 0;
  for (let hi = 0; hi < h.length && ni < n.length; hi++) {
    if (h[hi] === n[ni]) {
      score++;
      ni++;
    }
  }
  return ni === n.length ? score / h.length : 0;
}

const EVENT_TYPES = ['all', 'normal', 'merchandise'];
const ELIGIBILITIES = ['All', 'IIIT Students', 'Open'];
const FILTER_TABS = [
  { value: 'all', label: 'All Events' },
  { value: 'followed', label: 'Followed Clubs' },
];

const BrowseEvents = () => {
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterTab, setFilterTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [eligibilityFilter, setEligibilityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [searchInput, setSearchInput] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getBrowseEvents({
        type: typeFilter,
        eligibility: eligibilityFilter,
        startDate,
        endDate,
        filter: filterTab,
      });
      setAllEvents(data.events || []);
      setTrending(data.trending || []);
    } catch (err) {
      setError(err || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, eligibilityFilter, startDate, endDate, filterTab]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const displayedEvents = useMemo(() => {
    if (!searchInput.trim()) return allEvents;

    return allEvents
      .map((event) => {
        const titleScore = fuzzyScore(searchInput, event.title);
        const orgScore = fuzzyScore(searchInput, event.organizer?.name || '');
        return { ...event, _score: Math.max(titleScore, orgScore) };
      })
      .filter((e) => e._score > 0)
      .sort((a, b) => b._score - a._score);
  }, [allEvents, searchInput]);

  const fmt = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const registrationLabel = (event) => {
    if (event.status === 'closed') return { text: 'Registrations Closed', cls: 'badge-closed' };
    if (event.status === 'ongoing') return { text: 'Ongoing', cls: 'badge-ongoing' };
    const deadline = new Date(event.registrationDeadline);
    const daysLeft = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) return { text: `${daysLeft}d left`, cls: 'badge-urgent' };
    return { text: `Open — ${fmt(event.registrationDeadline)}`, cls: 'badge-open' };
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container">
      <ParticipantSidebar />

      <div className="dashboard-content browse-events-content">
        {/* ── Page header ─── */}
        <div className="welcome-section">
          <h2>Browse Events</h2>
          <p style={{ color: '#666', marginTop: 4 }}>
            Discover upcoming events — even if registrations are closed.
          </p>
        </div>

        {/* ── Trending strip ─── */}
        {trending.length > 0 && (
          <section className="browse-trending-section">
            <h3 className="browse-section-title">Trending (last 24 h)</h3>
            <div className="browse-trending-strip">
              {trending.map((event) => (
                <div key={event._id} className="browse-trending-card">
                  <span className="trending-count">+{event.trendingCount}</span>
                  <strong>{event.title}</strong>
                  <span className="trending-org">{event.organizer?.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Controls ─── */}
        <div className="browse-controls">
          {/* Search */}
          <div className="browse-search-row">
            <input
              type="text"
              className="browse-search-input"
              placeholder="Search events or organizers…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Filter tabs */}
          <div className="browse-filter-tabs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                className={`browse-tab ${filterTab === tab.value ? 'active' : ''}`}
                onClick={() => setFilterTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Row of dropdowns + date range */}
          <div className="browse-filter-row">
            <select
              className="browse-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>

            <select
              className="browse-select"
              value={eligibilityFilter}
              onChange={(e) => setEligibilityFilter(e.target.value)}
            >
              <option value="">All Eligibilities</option>
              {ELIGIBILITIES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>

            <label className="browse-date-label">
              From
              <input
                type="date"
                className="browse-date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>

            <label className="browse-date-label">
              To
              <input
                type="date"
                className="browse-date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>

            {(typeFilter !== 'all' || eligibilityFilter || startDate || endDate) && (
              <button
                className="browse-clear-btn"
                onClick={() => {
                  setTypeFilter('all');
                  setEligibilityFilter('');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ── Results ─── */}
        {loading ? (
          <p className="browse-status">Loading events…</p>
        ) : error ? (
          <p className="browse-status error-message">{error}</p>
        ) : displayedEvents.length === 0 ? (
          <p className="browse-status">No events match your filters.</p>
        ) : (
          <div className="browse-event-grid">
            {displayedEvents.map((event) => {
              const reg = registrationLabel(event);
              return (
                <div key={event._id} className="browse-event-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/participant/events/${event._id}`)}>
                  {event.image && (
                    <img src={event.image} alt={event.title} className="browse-event-img" />
                  )}
                  <div className="browse-event-body">
                    <div className="browse-event-header">
                      <h4>{event.title}</h4>
                      <span className={`browse-badge ${reg.cls}`}>{reg.text}</span>
                    </div>
                    <p className="browse-event-org">
                      {event.organizer?.name}
                      {event.organizer?.category && (
                        <span className="browse-event-category"> · {event.organizer.category}</span>
                      )}
                    </p>
                    <p className="browse-event-desc">{event.description}</p>
                    <div className="browse-event-meta">
                      <span>📅 {fmt(event.startDate)} – {fmt(event.endDate)}</span>
                      <span>👥 {event.eligibility}</span>
                      {event.registrationFee > 0 && (
                        <span>₹{event.registrationFee}</span>
                      )}
                      {event.eventTags?.length > 0 && (
                        <div className="browse-tags">
                          {event.eventTags.map((tag) => (
                            <span key={tag} className="browse-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseEvents;
