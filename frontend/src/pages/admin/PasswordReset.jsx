import AdminSidebar from '../../components/Admin/AdminSidebar';
import { useEffect, useMemo, useState } from 'react';
import {
  adminListPasswordResetRequests,
  adminApprovePasswordResetRequest,
  adminRejectPasswordResetRequest,
    getErrorMessage,
} from '../../utils/api';
import '../../styles/Dashboard.css';

const PasswordReset = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('pending');
    const [commentDraft, setCommentDraft] = useState({});
    const [workingId, setWorkingId] = useState(null);
    const [generatedInfo, setGeneratedInfo] = useState(null);

    const loadRequests = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await adminListPasswordResetRequests();
            setRequests(data.requests || []);
        } catch (e) {
            setError(getErrorMessage(e, 'Failed to load password reset requests.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadRequests(); }, []);

    const pending = useMemo(() => requests.filter((r) => r.status === 'Pending'), [requests]);
    const history = useMemo(() => requests.filter((r) => r.status !== 'Pending'), [requests]);

    const approve = async (requestId) => {
        setWorkingId(requestId);
        try {
            const res = await adminApprovePasswordResetRequest(requestId, commentDraft[requestId] || '');
            setGeneratedInfo({
                organizerName: res.organizer?.name,
                organizerEmail: res.organizer?.email,
                password: res.generatedPassword,
            });
            await loadRequests();
        } catch (e) {
            setError(getErrorMessage(e, 'Failed to approve request.'));
        } finally {
            setWorkingId(null);
        }
    };

    const reject = async (requestId) => {
        setWorkingId(requestId);
        try {
            await adminRejectPasswordResetRequest(requestId, commentDraft[requestId] || '');
            await loadRequests();
        } catch (e) {
            setError(getErrorMessage(e, 'Failed to reject request.'));
        } finally {
            setWorkingId(null);
        }
    };

    const rows = activeTab === 'pending' ? pending : history;

    return (
        <div className="dashboard-container participant-dashboard-container">
            <AdminSidebar />
            <div className="dashboard-content participant-dashboard-content">
                <div className="info-section">
                    <h3>Password Reset Requests</h3>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button
                            className={`participant-tab ${activeTab === 'pending' ? 'active' : ''}`}
                            onClick={() => setActiveTab('pending')}
                        >
                            Pending ({pending.length})
                        </button>
                        <button
                            className={`participant-tab ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            History ({history.length})
                        </button>
                    </div>

                    {generatedInfo && (
                        <div style={{ background: '#fff6e8', border: '1px solid #f5d08a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                            <strong>Approved.</strong>
                            <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                                Share this new password with {generatedInfo.organizerName} ({generatedInfo.organizerEmail}):
                            </p>
                            <p style={{ margin: '6px 0 0', fontFamily: 'monospace', fontSize: 16, fontWeight: 700 }}>
                                {generatedInfo.password}
                            </p>
                        </div>
                    )}

                    {loading ? (
                        <p>Loading…</p>
                    ) : rows.length === 0 ? (
                        <p>No requests in this section.</p>
                    ) : (
                        <div className="participant-table-container">
                            <table className="participant-table">
                                <thead>
                                    <tr>
                                        <th>Club Name</th>
                                        <th>Email</th>
                                        <th>Date</th>
                                        <th>Reason</th>
                                        <th>Status</th>
                                        <th>Admin Comment</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((request) => (
                                        <tr key={request._id}>
                                            <td>{request.organizer?.name || '—'}</td>
                                            <td>{request.organizer?.email || '—'}</td>
                                            <td>{new Date(request.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                            <td style={{ maxWidth: 280 }}>{request.reason}</td>
                                            <td>{request.status}</td>
                                            <td>
                                                {request.status === 'Pending' ? (
                                                    <input
                                                        value={commentDraft[request._id] || ''}
                                                        onChange={(e) => setCommentDraft({ ...commentDraft, [request._id]: e.target.value })}
                                                        placeholder="Optional comment"
                                                    />
                                                ) : (
                                                    request.adminComment || '—'
                                                )}
                                            </td>
                                            <td>
                                                {request.status === 'Pending' ? (
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button
                                                            className="card-button"
                                                            disabled={workingId === request._id}
                                                            onClick={() => approve(request._id)}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            className="card-button"
                                                            style={{ background: '#c0392b' }}
                                                            disabled={workingId === request._id}
                                                            onClick={() => reject(request._id)}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    request.reviewedAt
                                                        ? `Reviewed ${new Date(request.reviewedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
                                                        : '—'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {error && <p className="error-message" style={{ marginTop: 12 }}>{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default PasswordReset;
