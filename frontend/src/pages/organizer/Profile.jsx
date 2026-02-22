import { useEffect, useState } from 'react';
import OrganizerSidebar from '../../components/OrganizerSidebar';
import { getOrganizerProfile, updateOrganizerProfile } from '../../utils/api';
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
                </section>
            </div>
        </div>
    );
};

export default OrganizerProfile;
