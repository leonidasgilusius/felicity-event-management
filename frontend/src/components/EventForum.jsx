import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getForumMessages,
  createForumMessage,
  toggleForumReaction,
  toggleForumPin,
  deleteForumMessage,
  getErrorMessage,
} from '../utils/api';

const EMOJIS = ['👍', '❤️', '👏', '😂', '❓'];

const fmt = (date) => new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function MessageNode({
  node,
  depth = 0,
  isOrganizer,
  onReply,
  onReact,
  onPin,
  onDelete,
  replyDrafts,
  setReplyDrafts,
  submitReply,
  busyReply,
}) {
  return (
    <div style={{ marginLeft: depth ? 20 : 0, borderLeft: depth ? '2px solid #eee' : 'none', paddingLeft: depth ? 10 : 0, marginTop: 10 }}>
      <div style={{ background: node.isAnnouncement ? '#fff8e1' : '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13 }}>
            <strong>{node.author?.name || 'Unknown'}</strong>
            <span style={{ marginLeft: 8, color: '#777' }}>({node.author?.role || 'User'})</span>
            {node.isPinned && <span style={{ marginLeft: 8, color: '#e67e22', fontWeight: 700 }}>📌 Pinned</span>}
            {node.isAnnouncement && <span style={{ marginLeft: 8, color: '#8e44ad', fontWeight: 700 }}>📢 Announcement</span>}
          </div>
          <span style={{ fontSize: 12, color: '#777' }}>{fmt(node.createdAt)}</span>
        </div>

        <p style={{ margin: '8px 0', color: node.isDeleted ? '#999' : '#222' }}>{node.content}</p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {EMOJIS.map((emoji) => {
            const reaction = node.reactions.find((entry) => entry.emoji === emoji);
            const count = reaction?.count || 0;
            const reacted = reaction?.reactedByMe;
            return (
              <button
                key={emoji}
                onClick={() => onReact(node._id, emoji)}
                style={{
                  border: reacted ? '1.5px solid #1a73e8' : '1px solid #ddd',
                  background: reacted ? '#e8f0fe' : '#fff',
                  borderRadius: 14,
                  padding: '3px 8px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {emoji} {count > 0 ? count : ''}
              </button>
            );
          })}

          {!node.isDeleted && (
            <button onClick={() => onReply(node._id)} style={{ border: 'none', background: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: 13 }}>
              Reply
            </button>
          )}

          {isOrganizer && (
            <>
              <button
                onClick={() => onPin(node._id, !node.isPinned)}
                style={{ border: 'none', background: 'none', color: '#e67e22', cursor: 'pointer', fontSize: 13 }}
              >
                {node.isPinned ? 'Unpin' : 'Pin'}
              </button>
              {!node.isDeleted && (
                <button
                  onClick={() => onDelete(node._id)}
                  style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 13 }}
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>

        {replyDrafts[node._id] !== undefined && !node.isDeleted && (
          <div style={{ marginTop: 8 }}>
            <textarea
              rows={2}
              value={replyDrafts[node._id]}
              onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [node._id]: e.target.value }))}
              placeholder="Write a reply..."
              style={{ width: '100%' }}
            />
            <button
              onClick={() => submitReply(node._id)}
              disabled={busyReply === node._id}
              className="card-button"
              style={{ marginTop: 6 }}
            >
              {busyReply === node._id ? 'Posting…' : 'Post Reply'}
            </button>
          </div>
        )}
      </div>

      {node.replies?.map((reply) => (
        <MessageNode
          key={reply._id}
          node={reply}
          depth={depth + 1}
          isOrganizer={isOrganizer}
          onReply={onReply}
          onReact={onReact}
          onPin={onPin}
          onDelete={onDelete}
          replyDrafts={replyDrafts}
          setReplyDrafts={setReplyDrafts}
          submitReply={submitReply}
          busyReply={busyReply}
        />
      ))}
    </div>
  );
}

export default function EventForum({ eventId }) {
  const { user } = useAuth();
  const isOrganizer = String(user?.role || '').toLowerCase() === 'organizer';

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newMessage, setNewMessage] = useState('');
  const [announcement, setAnnouncement] = useState(false);
  const [posting, setPosting] = useState(false);

  const [replyDrafts, setReplyDrafts] = useState({});
  const [busyReply, setBusyReply] = useState(null);

  const [refreshError, setRefreshError] = useState('');
  const [newCount, setNewCount] = useState(0);

  const flattenCount = useMemo(() => {
    const countNodes = (nodes) => nodes.reduce((sum, node) => sum + 1 + countNodes(node.replies || []), 0);
    return countNodes(messages);
  }, [messages]);

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError('');
      }
      const data = await getForumMessages(eventId);
      const next = data.messages || [];
      if (silent) {
        const countNodes = (nodes) => nodes.reduce((sum, node) => sum + 1 + countNodes(node.replies || []), 0);
        const nextCount = countNodes(next);
        if (nextCount > flattenCount) {
          setNewCount((prev) => prev + (nextCount - flattenCount));
        }
      }
      setMessages(next);
      if (!silent) setNewCount(0);
    } catch (e) {
      if (!silent) setError(getErrorMessage(e, 'Failed to load forum messages.'));
      else setRefreshError('Live refresh failed.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [eventId]);

  useEffect(() => {
    const timer = setInterval(() => loadMessages(true), 5000);
    return () => clearInterval(timer);
  }, [eventId, flattenCount]);

  const postMessage = async () => {
    if (!newMessage.trim()) return;
    setPosting(true);
    try {
      await createForumMessage(eventId, {
        content: newMessage.trim(),
        isAnnouncement: announcement,
      });
      setNewMessage('');
      setAnnouncement(false);
      await loadMessages();
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to post message.'));
    } finally {
      setPosting(false);
    }
  };

  const toggleReply = (messageId) => {
    setReplyDrafts((prev) => {
      if (prev[messageId] !== undefined) {
        const next = { ...prev };
        delete next[messageId];
        return next;
      }
      return { ...prev, [messageId]: '' };
    });
  };

  const submitReply = async (messageId) => {
    const content = replyDrafts[messageId];
    if (!content || !content.trim()) return;

    setBusyReply(messageId);
    try {
      await createForumMessage(eventId, {
        content: content.trim(),
        parentMessageId: messageId,
      });
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
      await loadMessages();
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to post reply.'));
    } finally {
      setBusyReply(null);
    }
  };

  const react = async (messageId, emoji) => {
    try {
      await toggleForumReaction(messageId, emoji);
      await loadMessages(true);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to react to message.'));
    }
  };

  const pin = async (messageId, isPinned) => {
    try {
      await toggleForumPin(messageId, isPinned);
      await loadMessages();
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to update pin state.'));
    }
  };

  const remove = async (messageId) => {
    try {
      await deleteForumMessage(messageId);
      await loadMessages();
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to delete message.'));
    }
  };

  return (
    <div className="ed-card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Discussion Forum</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {newCount > 0 && <span style={{ background: '#e8f0fe', color: '#1a73e8', borderRadius: 14, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{newCount} new</span>}
          <button className="card-button" onClick={() => loadMessages()} style={{ padding: '6px 12px' }}>Refresh</button>
        </div>
      </div>


      <div style={{ marginTop: 10 }}>
        <textarea
          rows={3}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Ask a question or share an update..."
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 10, flexWrap: 'wrap' }}>
          {isOrganizer && (
            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={announcement} onChange={(e) => setAnnouncement(e.target.checked)} />
              Post as announcement
            </label>
          )}
          <button className="card-button" onClick={postMessage} disabled={posting}>
            {posting ? 'Posting…' : 'Post Message'}
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ marginTop: 12 }}>Loading forum…</p>
      ) : messages.length === 0 ? (
        <p style={{ marginTop: 12, color: '#777' }}>No messages yet. Start the conversation.</p>
      ) : (
        <div style={{ marginTop: 10 }}>
          {messages.map((message) => (
            <MessageNode
              key={message._id}
              node={message}
              isOrganizer={isOrganizer}
              onReply={toggleReply}
              onReact={react}
              onPin={pin}
              onDelete={remove}
              replyDrafts={replyDrafts}
              setReplyDrafts={setReplyDrafts}
              submitReply={submitReply}
              busyReply={busyReply}
            />
          ))}
        </div>
      )}

      {refreshError && <p style={{ color: '#b26a00', marginTop: 10 }}>{refreshError}</p>}
      {error && <p className="error-message" style={{ marginTop: 10 }}>{error}</p>}
    </div>
  );
}
