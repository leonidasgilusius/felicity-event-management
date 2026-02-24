import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import OrganizerSidebar from '../../components/Organizer/OrganizerSidebar';
import { getEventOrders, approveOrder, rejectOrder, getOrderProof, getErrorMessage } from '../../utils/api';
import '../../styles/Dashboard.css';

const STATUS_LABELS = {
  pending_approval: { label: 'Pending',  color: '#856404', bg: '#fff3cd', border: '#ffc107' },
  approved:         { label: 'Approved', color: '#155724', bg: '#d4edda', border: '#28a745' },
  rejected:         { label: 'Rejected', color: '#721c24', bg: '#f8d7da', border: '#dc3545' },
};

function Badge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: '#333', bg: '#eee', border: '#ccc' };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700,
    }}>
      {s.label}
    </span>
  );
}

export default function PaymentApprovals() {
  const { eventId } = useParams();
  const [orders, setOrders]     = useState([]);
  const [event, setEvent]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filter, setFilter]     = useState('all');
  const [preview, setPreview]   = useState(null);   
  const [proofCache, setProofCache] = useState({}); 
  const [working, setWorking]   = useState(null);  

  useEffect(() => {
    (async () => {
      try {
        const data = await getEventOrders(eventId);
        setOrders(data.orders);
        setEvent(data.event || { title: data.eventTitle });
      } catch (e) {
        setError(getErrorMessage(e, 'Failed to load orders.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const handleViewProof = async (orderId) => {
    setPreview({ orderId });
    if (proofCache[orderId]) return;  
    setProofCache((prev) => ({ ...prev, [orderId]: 'loading' }));
    try {
      const data = await getOrderProof(orderId);
      setProofCache((prev) => ({ ...prev, [orderId]: data.paymentProofUrl }));
    } catch {
      setProofCache((prev) => ({ ...prev, [orderId]: 'error' }));
    }
  };

  const handleApprove = async (orderId) => {
    setWorking(orderId);
    try {
      const res = await approveOrder(orderId);
      setOrders((prev) =>
        prev.map((o) => o._id === orderId ? { ...o, paymentStatus: 'approved', status: 'confirmed', message: res.message } : o)
      );
    } catch (e) {
      alert(getErrorMessage(e, 'Failed to approve.'));
    } finally {
      setWorking(null);
    }
  };

  const handleReject = async (orderId) => {
    setWorking(orderId);
    try {
      await rejectOrder(orderId);
      setOrders((prev) =>
        prev.map((o) => o._id === orderId ? { ...o, paymentStatus: 'rejected', status: 'pending' } : o)
      );
    } catch (e) {
      alert(getErrorMessage(e, 'Failed to reject.'));
    } finally {
      setWorking(null);
    }
  };

  const visible = filter === 'all'
    ? orders
    : orders.filter((o) => o.paymentStatus === filter);

  const isLikelyImageProof = (proofValue) => {
    if (!proofValue || typeof proofValue !== 'string') return false;
    if (proofValue.startsWith('data:image/')) return true;
    return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(proofValue);
  };

  return (
    <div className="dashboard-layout">
      <OrganizerSidebar />
      <main className="dashboard-main">
        <div style={{ marginBottom: 20 }}>
          <Link to={`/organizer/events/${eventId}`} style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>
            ← Back to Event
          </Link>
          <h2 style={{ margin: '8px 0 4px', fontSize: 22 }}>Payment Approvals</h2>
          {event && <p style={{ color: '#666', fontSize: 14, margin: 0 }}>{event.title}</p>}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'all',              label: 'All' },
            { key: 'pending_approval', label: 'Pending' },
            { key: 'approved',         label: 'Approved' },
            { key: 'rejected',         label: 'Rejected' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: filter === key ? '2px solid #1a73e8' : '1.5px solid #ddd',
                background: filter === key ? '#e8f0fe' : 'white',
                color: filter === key ? '#1a73e8' : '#555',
              }}
            >
              {label}
              {key !== 'all' && (
                <span style={{ marginLeft: 6, background: '#eee', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                  {orders.filter((o) => o.paymentStatus === key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && <p>Loading orders…</p>}
        {error   && <p style={{ color: 'red' }}>{error}</p>}
        {!loading && !error && visible.length === 0 && (
          <p style={{ color: '#888' }}>No orders found.</p>
        )}

        {/* Order cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visible.map((order) => (
            <div
              key={order._id}
              style={{
                background: 'white', borderRadius: 12, border: '1px solid #e8e8e8',
                padding: '18px 22px', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                {/* Left: participant info */}
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{order.name || 'Unknown'}</p>
                  <p style={{ margin: '2px 0 6px', color: '#666', fontSize: 13 }}>{order.email}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
                    Order: <code style={{ background: '#f5f5f5', padding: '1px 6px', borderRadius: 4 }}>{order._id}</code>
                  </p>
                  {order.totalPrice != null && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#333' }}>
                      Amount: <strong>₹{order.totalPrice}</strong>
                    </p>
                  )}
                  {order.quantity != null && (
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#333' }}>
                      Qty: {order.quantity}
                    </p>
                  )}
                  {order.selectedVariants && Object.keys(order.selectedVariants).length > 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
                      {Object.entries(order.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </p>
                  )}
                </div>

                {/* Right: status + actions */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                  <Badge status={order.paymentStatus} />

                  {order.hasProof ? (
                    <button
                      onClick={() => handleViewProof(order._id)}
                      style={{
                        background: '#f0f4ff', color: '#1a73e8', border: '1px solid #d0deff',
                        borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      View Proof
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: '#aaa' }}>No proof uploaded</span>
                  )}

                  {order.paymentStatus === 'pending_approval' && order.hasProof && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleApprove(order._id)}
                        disabled={working === order._id}
                        style={{
                          background: '#28a745', color: 'white', border: 'none',
                          borderRadius: 8, padding: '7px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          opacity: working === order._id ? 0.6 : 1,
                        }}
                      >
                        {working === order._id ? '…' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(order._id)}
                        disabled={working === order._id}
                        style={{
                          background: 'white', color: '#dc3545', border: '1.5px solid #dc3545',
                          borderRadius: 8, padding: '7px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          opacity: working === order._id ? 0.6 : 1,
                        }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Proof image lightbox */}
        {preview && (
          <div
            onClick={() => setPreview(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 9999, padding: 24,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 12, padding: 20, maxWidth: '90vw',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>Payment Proof</h4>
                <button
                  onClick={() => setPreview(null)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}
                >
                  ✕
                </button>
              </div>
              {proofCache[preview.orderId] === 'loading' && <p style={{ color: '#888' }}>Loading…</p>}
              {proofCache[preview.orderId] === 'error'   && <p style={{ color: 'red' }}>Failed to load proof image.</p>}
              {proofCache[preview.orderId] && proofCache[preview.orderId] !== 'loading' && proofCache[preview.orderId] !== 'error' && (
                isLikelyImageProof(proofCache[preview.orderId]) ? (
                  <img
                    src={proofCache[preview.orderId]}
                    alt="Payment proof"
                    style={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
                  />
                ) : (
                  <div style={{ background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
                    <p style={{ margin: '0 0 8px', color: '#555', fontSize: 13 }}>
                      This proof was submitted as a share link.
                    </p>
                    <a href={proofCache[preview.orderId]} target="_blank" rel="noreferrer"
                      style={{ color: '#1a73e8', fontWeight: 600, textDecoration: 'none' }}>
                      Open submitted proof link ↗
                    </a>
                  </div>
                )
              )}
              {orders.find((o) => o._id === preview.orderId)?.paymentStatus === 'pending_approval' && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { handleApprove(preview.orderId); setPreview(null); }}
                    style={{
                      background: '#28a745', color: 'white', border: 'none',
                      borderRadius: 8, padding: '8px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => { handleReject(preview.orderId); setPreview(null); }}
                    style={{
                      background: 'white', color: '#dc3545', border: '1.5px solid #dc3545',
                      borderRadius: 8, padding: '8px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    ✗ Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
