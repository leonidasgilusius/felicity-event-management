import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import '../../styles/Dashboard.css';
import {
  adminListOrganizers,
  adminCreateOrganizer,
  adminToggleDisableOrganizer,
  adminArchiveOrganizer,
  adminDeleteOrganizer
} from '../../utils/api';

const ManageOrganizers = () => {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [createdInfo, setCreatedInfo] = useState(null);

  useEffect(() => {
    loadOrganizers();
  }, []);

  const loadOrganizers = async () => {
    try {
      setLoading(true);
      const data = await adminListOrganizers();
      setOrganizers(data.organizers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const data = await adminCreateOrganizer({ name: newName.trim() });
      setCreatedInfo({ email: data.organizer.email, password: data.password });
      setNewName('');
      await loadOrganizers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('copy failed', err);
    }
  };

  const toggleDisable = async (id) => {
    try {
      await adminToggleDisableOrganizer(id);
      await loadOrganizers();
    } catch (err) {
      console.error(err);
    }
  };

  const archive = async (id) => {
    try {
      await adminArchiveOrganizer(id);
      await loadOrganizers();
    } catch (err) {
      console.error(err);
    }
  };

  const remove = async (id) => {
    try {
      await adminDeleteOrganizer(id);
      await loadOrganizers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-container participant-dashboard-container">
      <AdminSidebar />
      <div className="dashboard-content participant-dashboard-content">
        <div className="info-section">
          <h3>Manage Clubs / Organizers</h3>

          <div className="organizer-create">
            <input placeholder="Club/Organizer Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className="card-button" onClick={handleCreate}>Add Organizer</button>
          </div>

          {createdInfo && (
            <div className="info-section">
              <h4>New Organizer Credentials</h4>
              <p>Email: {createdInfo.email} <button onClick={() => handleCopy(createdInfo.email)}>Copy</button></p>
              <p>Password: {createdInfo.password} <button onClick={() => handleCopy(createdInfo.password)}>Copy</button></p>
            </div>
          )}

          <h4>All Organizers</h4>
          {loading ? <p>Loading...</p> : (
            <div className="organizer-list">
              {organizers.map((o) => (
                <div key={o._id} className="organizer-item">
                  <div>
                    <strong>{o.name}</strong>
                    <div>{o.email}</div>
                    <div>{o.isDisabled ? 'Disabled' : 'Active'} {o.archived ? '(Archived)' : ''}</div>
                  </div>
                  <div className="organizer-actions">
                    <button onClick={() => handleCopy(o.email)}>Copy Email</button>
                    <button onClick={() => toggleDisable(o._id)}>{o.isDisabled ? 'Enable' : 'Disable'}</button>
                    <button onClick={() => archive(o._id)}>Archive</button>
                    <button onClick={() => remove(o._id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageOrganizers;
