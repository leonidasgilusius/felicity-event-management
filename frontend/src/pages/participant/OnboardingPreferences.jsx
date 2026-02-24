import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listOrganizers, updateParticipantProfile } from '../../utils/participantApi';
import { getErrorMessage } from '../../utils/api';
import '../../styles/Auth.css';

const INTEREST_OPTIONS = [
  'Technology',
  'Music',
  'Sports',
  'Art',
  'Science',
  'Literature',
  'Gaming',
  'Film',
  'Dance',
  'Food'
];

const OnboardingPreferences = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [interests, setInterests] = useState([]);
  const [followedOrganizers, setFollowedOrganizers] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!location.state?.fromRegistration) {
      navigate('/participant-dashboard', { replace: true });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    const loadOrganizers = async () => {
      try {
        const data = await listOrganizers();
        setOrganizers(data.organizers || []);
      } catch (_) {
        setOrganizers([]);
      } finally {
        setLoadingOrganizers(false);
      }
    };

    loadOrganizers();
  }, []);

  const toggleInterest = (interest) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };

  const toggleOrganizer = (organizerId) => {
    setFollowedOrganizers((prev) =>
      prev.includes(organizerId)
        ? prev.filter((id) => id !== organizerId)
        : [...prev, organizerId]
    );
  };

  const saveAndContinue = async () => {
    setSaving(true);
    setError('');

    try {
      await updateParticipantProfile({
        interests,
        followedOrganizers,
      });
      navigate('/participant-dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save preferences.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 700 }}>
        <h2>Set Your Preferences</h2>
        <p style={{ marginTop: -4, marginBottom: 16 }}>
          Choose your interests and clubs to personalize recommendations. You can skip now and edit later from Profile.
        </p>

        <div className="form-group">
          <label>Areas of Interest</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {INTEREST_OPTIONS.map((interest) => (
              <label key={interest} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={interests.includes(interest)}
                  onChange={() => toggleInterest(interest)}
                />
                <span>{interest}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Clubs / Organizers to Follow</label>
          {loadingOrganizers ? (
            <p style={{ marginTop: 8 }}>Loading organizers…</p>
          ) : organizers.length === 0 ? (
            <p style={{ marginTop: 8 }}>No organizers available right now.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8, marginTop: 10, maxHeight: 220, overflowY: 'auto' }}>
              {organizers.map((organizer) => (
                <label key={organizer._id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  
                  <span>{organizer.name}</span>
                  {organizer.category ? <span>({organizer.category})</span> : null}
                  <input
                    type="checkbox"
                    checked={followedOrganizers.includes(organizer._id)}
                    onChange={() => toggleOrganizer(organizer._id)}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="auth-button"
            onClick={saveAndContinue}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save & Continue'}
          </button>
          <button
            type="button"
            className="auth-button"
            onClick={() => navigate('/participant-dashboard')}
            disabled={saving}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPreferences;
