import { useEffect, useState } from 'react';
import OrganizerSidebar from '../../components/OrganizerSidebar';
import {
    getOrganizerProfile,
    updateOrganizerProfile,
    createOrganizerPasswordResetRequest,
    listOrganizerPasswordResetRequests,
} from '../../utils/api';
import '../../styles/Dashboard.css';

const OrganizerProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        name: '', category: '', description: '',
        contactEmail: '', contactPhone: '', discordWebhook: '',
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [resetReason, setResetReason] = useState('');
    const [resetRequests, setResetRequests] = useState([]);
    const [resetMsg, setResetMsg] = useState('');
    const [resetError, setResetError] = useState('');
    const [submittingReset, setSubmittingReset] = useState(false);

    const loadResetRequests = async () => {
        try {
            const data = await listOrganizerPasswordResetRequests();
            setResetRequests(data.requests || []);
        } catch {
            // keep profile usable even if request history fails
        }
    };

    useEffect(() => {
        getOrganizerProfile()
            .then((data) => {
                setProfile(data.profile);
                setForm({
                    name: data.profile.name || '',
                    category: data.profile.category || '',
                    description: data.profile.description || '',
                    contactEmail: data.profile.contactEmail || '',
                    contactPhone: data.profile.contactPhone || '',
                    discordWebhook: data.profile.discordWebhook || '',
                });
            })
            .catch((e) => setError(e || 'Failed to load profile.'))
            .finally(() => setLoading(false));

            loadResetRequests();
    }, []);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg('');
        setError('');
        try {
            const data = await updateOrganizerProfile(form);
            setProfile(data.profile);
            setMsg('Profile updated successfully.');
        } catch (err) {
            setError(err || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleResetRequest = async (e) => {
        e.preventDefault();
        setResetMsg('');
        setResetError('');

        if (!resetReason.trim()) {
            setResetError('Please provide a reason for password reset request.');
            return;
        }

        setSubmittingReset(true);
        try {
            await createOrganizerPasswordResetRequest(resetReason.trim());
            setResetReason('');
            setResetMsg('Password reset request submitted to admin.');
            await loadResetRequests();
        } catch (err) {
            setResetError(err || 'Failed to submit password reset request.');
        } finally {
            setSubmittingReset(false);
        }
    };

    return (
        <div className="dashboard-container participant-dashboard-container">
            <OrganizerSidebar />
            <div className="dashboard-content participant-dashboard-content">
                <section className="info-section participant-section">
                    <h3>Organizer Profile</h3>

                    {loading ? (
                        <p>Loading…</p>
                    ) : (
                        <form className="organizer-form" onSubmit={handleSave} style={{ maxWidth: 560 }}>
                            {/* Read-only login email */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 4 }}>
                                    Login Email <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}>(non-editable)</span>
                                </label>
                                <input
                                    value={profile?.email || ''}
                                    disabled
                                    style={{ background: '#f5f5f5', color: '#888', cursor: 'not-allowed' }}
                                />
                            </div>

                            <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Name</label>
                            <input
                                name="name"
                                placeholder="Organizer name"
                                value={form.name}
                                onChange={onChange}
                                required
                            />

                            <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Category</label>
                            <input
                                name="category"
                                placeholder="e.g. Tech, Cultural, Sports"
                                value={form.category}
                                onChange={onChange}
                            />

                            <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Description</label>
                            <textarea
                                name="description"
                                placeholder="Describe your organization…"
                                value={form.description}
                                onChange={onChange}
                                rows={3}
                            />

                            <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Contact Email</label>
                            <input
                                name="contactEmail"
                                type="email"
                                placeholder="Public contact email"
                                value={form.contactEmail}
                                onChange={onChange}
                            />

                            <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Contact Phone</label>
                            <input
                                name="contactPhone"
                                placeholder="+91 00000 00000"
                                value={form.contactPhone}
                                onChange={onChange}
                            />

                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 4 }}>
                                    Discord Webhook URL
                                    <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 6 }}>
                                        (Auto-posts new events to your Discord channel)
                                    </span>
                                </label>
                                <input
                                    name="discordWebhook"
                                    placeholder="https://discord.com/api/webhooks/…"
                                    value={form.discordWebhook}
                                    onChange={onChange}
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                />
                                {form.discordWebhook && (
                                    <p style={{ fontSize: 12, color: '#27ae60', margin: '4px 0 0' }}>
                                        ✓ When you publish an event, it will be announced in your Discord channel.
                                    </p>
                                )}
                            </div>

                            {error && (
                                <p style={{ color: '#c0392b', background: '#feeaea', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>
                                    {error}
                                </p>
                            )}
                            {msg && (
                                <p style={{ color: '#27ae60', background: '#e8f8ef', padding: '10px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
                                    {msg}
                                </p>
                            )}

                            <button type="submit" className="card-button" disabled={saving} style={{ marginTop: 8 }}>
                                {saving ? 'Saving…' : 'Save Profile'}
                            </button>
                        </form>
                    )}

                    {!loading && (
                        <div style={{ marginTop: 28, maxWidth: 560 }}>
                            <h4 style={{ marginBottom: 10 }}>Password Reset Request</h4>
                            <form onSubmit={handleResetRequest} className="organizer-form">
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Reason</label>
                                <textarea
                                    rows={3}
                                    placeholder="Explain why you need password reset"
                                    value={resetReason}
                                    onChange={(e) => setResetReason(e.target.value)}
                                />
                                <button type="submit" className="card-button" disabled={submittingReset}>
                                    {submittingReset ? 'Submitting…' : 'Request Password Reset from Admin'}
                                </button>
                            </form>

                            {resetError && <p className="error-message" style={{ marginTop: 8 }}>{resetError}</p>}
                            {resetMsg && <p style={{ color: '#27ae60', marginTop: 8, fontWeight: 600 }}>{resetMsg}</p>}

                            <div style={{ marginTop: 14 }}>
                                <h5 style={{ marginBottom: 8 }}>Request Status History</h5>
                                {resetRequests.length === 0 ? (
                                    <p style={{ color: '#777' }}>No password reset requests yet.</p>
                                ) : (
                                    <div className="participant-table-container">
                                        <table className="participant-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Reason</th>
                                                    <th>Status</th>
                                                    <th>Admin Comment</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {resetRequests.map((request) => (
                                                    <tr key={request._id}>
                                                        <td>{new Date(request.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                                        <td style={{ maxWidth: 260 }}>{request.reason}</td>
                                                        <td>{request.status}</td>
                                                        <td>{request.adminComment || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default OrganizerProfile;
