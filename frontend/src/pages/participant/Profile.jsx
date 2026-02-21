import { useEffect, useState } from 'react';
import ParticipantSidebar from '../../components/ParticipantSidebar';
import { getParticipantProfile, updateParticipantProfile, changePassword } from '../../utils/participantApi';
import '../../styles/Dashboard.css';
import '../../styles/ParticipantProfile.css';

const INTEREST_OPTIONS = ['Technology', 'Music', 'Sports', 'Art', 'Science', 'Literature', 'Gaming', 'Film', 'Dance', 'Food'];

const ParticipantProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    getParticipantProfile()
      .then((data) => {
        setProfile(data.profile);
        setForm({
          name: data.profile.name || '',
          lastName: data.profile.lastName || '',
          contactNumber: data.profile.contactNumber || '',
          organisation: data.profile.organisation || '',
          interests: data.profile.interests || [],
          followedOrganizers: (data.profile.followedOrganizers || []).map((o) => o._id || o),
        });
      })
      .catch((err) => setError(err || 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveMsg(''); setSaveError('');
    try {
      await updateParticipantProfile(form);
      setSaveMsg('Profile updated successfully.');
    } catch (err) {
      setSaveError(err || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (interest) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(''); setPwError('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('New passwords do not match.'); return; }
    setPwSaving(true);
    try {
      const res = await changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwMsg(res.message);
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwError(err || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <div className="dashboard-container"><ParticipantSidebar /><div className="dashboard-content"><p>Loading…</p></div></div>;
  if (error) return <div className="dashboard-container"><ParticipantSidebar /><div className="dashboard-content"><p className="error-message">{error}</p></div></div>;

  return (
    <div className="dashboard-container">
      <ParticipantSidebar />
      <div className="dashboard-content pp-content">
        <div className="welcome-section"><h2>My Profile</h2></div>

        <div className="pp-card">
          <h3>Account Info</h3>
          <div className="pp-readonly-grid">
            <div><strong>Email</strong><span>{profile.email}</span></div>
            <div><strong>Type</strong><span>{profile.isIIIT ? 'IIIT Student' : 'Non-IIIT'}</span></div>
          </div>
        </div>

        <form onSubmit={handleSave} className="pp-card">
          <h3>Edit Profile</h3>
          <div className="pp-form-grid">
            <div className="pp-field"><label>First Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="pp-field"><label>Last Name</label><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            <div className="pp-field"><label>Contact Number</label><input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} /></div>
            <div className="pp-field"><label>College / Organization</label><input value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} /></div>
          </div>
          <div className="pp-field pp-interests">
            <label>Interests</label>
            <div className="pp-interest-chips">
              {INTEREST_OPTIONS.map((i) => (
                <button key={i} type="button" className={`pp-chip ${form.interests.includes(i) ? 'active' : ''}`} onClick={() => toggleInterest(i)}>{i}</button>
              ))}
            </div>
          </div>
          {profile.followedOrganizers?.length > 0 && (
            <div className="pp-field">
              <label>Followed Clubs</label>
              <div className="pp-followed-list">
                {profile.followedOrganizers.map((o) => <span key={o._id || o} className="pp-followed-chip">{o.name || o}</span>)}
              </div>
            </div>
          )}
          {saveMsg && <p className="pp-success">{saveMsg}</p>}
          {saveError && <p className="error-message">{saveError}</p>}
          <button type="submit" className="pp-save-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </form>

        <form onSubmit={handlePasswordChange} className="pp-card">
          <h3>Change Password</h3>
          <div className="pp-form-grid">
            <div className="pp-field"><label>Current Password</label><input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required /></div>
            <div className="pp-field"><label>New Password</label><input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={8} /></div>
            <div className="pp-field"><label>Confirm New Password</label><input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required /></div>
          </div>
          {pwMsg && <p className="pp-success">{pwMsg}</p>}
          {pwError && <p className="error-message">{pwError}</p>}
          <button type="submit" className="pp-save-btn" disabled={pwSaving}>{pwSaving ? 'Updating…' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  );
};

export default ParticipantProfile;
