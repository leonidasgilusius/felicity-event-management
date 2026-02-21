import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticipantSidebar from '../../components/ParticipantSidebar';
import { listOrganizers, toggleFollowOrganizer } from '../../utils/participantApi';
import '../../styles/Dashboard.css';
import '../../styles/Organizers.css';

const Organizers = () => {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    listOrganizers()
      .then((data) => setOrganizers(data.organizers))
      .catch((err) => setError(err || 'Failed to load organizers.'))
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = async (e, id) => {
    e.stopPropagation(); // Don't navigate when clicking follow button
    try {
      const res = await toggleFollowOrganizer(id);
      setOrganizers((prev) =>
        prev.map((o) => (String(o._id) === String(id) ? { ...o, isFollowed: res.isFollowed } : o))
      );
    } catch {
      // silent — button state doesn't change on failure
    }
  };

  return (
    <div className="dashboard-container">
      <ParticipantSidebar />
      <div className="dashboard-content org-list-content">
        <div className="welcome-section">
          <h2>Organizers</h2>
          <p style={{ color: '#666', marginTop: 4 }}>Follow clubs to see their events in Browse Events.</p>
        </div>

        {loading ? (
          <p className="browse-status">Loading…</p>
        ) : error ? (
          <p className="browse-status error-message">{error}</p>
        ) : organizers.length === 0 ? (
          <p className="browse-status">No organizers found.</p>
        ) : (
          <div className="org-grid">
            {organizers.map((org) => (
              <div key={org._id} className="org-card" onClick={() => navigate(`/participant/organizers/${org._id}`)}>
                <div className="org-card-header">
                  <div>
                    <h4>{org.name}</h4>
                    {org.category && <span className="org-category">{org.category}</span>}
                  </div>
                  <button
                    className={`org-follow-btn ${org.isFollowed ? 'following' : ''}`}
                    onClick={(e) => handleFollow(e, org._id)}
                  >
                    {org.isFollowed ? 'Unfollow' : 'Follow'}
                  </button>
                </div>
                {org.description && <p className="org-description">{org.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Organizers;
