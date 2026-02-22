import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import OrganizerSidebar from '../../components/OrganizerSidebar';
import {
  getAttendanceOverview,
  scanAttendanceTicket,
  manualMarkAttendance,
} from '../../utils/api';
import '../../styles/Dashboard.css';

const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function exportAttendanceCSV(rows, eventTitle) {
  const header = ['Name', 'Email', 'Ticket ID', 'Attendance Status', 'Check-In Time'];
  const data = rows.map((row) => [
    `"${row.name}"`,
    `"${row.email}"`,
    row.ticketId,
    row.scanned ? 'Present' : 'Absent',
    row.checkInTime ? fmt(row.checkInTime) : '',
  ]);

  const csv = [header, ...data].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${eventTitle || 'attendance'}-report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendancePage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState({ total: 0, scanned: 0, notScanned: 0 });
  const [participants, setParticipants] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [scanError, setScanError] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualBusyId, setManualBusyId] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const qrRef = useRef(null);
  const scannerRef = useRef(null);
  const [cameraRunning, setCameraRunning] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);

  const loadAttendance = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await getAttendanceOverview(eventId);
      setEvent(data.event);
      setStats(data.stats);
      setParticipants(data.participants || []);
    } catch (e) {
      setError(e || 'Failed to load attendance data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [eventId]);

  useEffect(() => {
    const timer = setInterval(() => loadAttendance(true), 12000);
    return () => clearInterval(timer);
  }, [eventId]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  const applyParticipantUpdate = (updated) => {
    setParticipants((prev) =>
      prev.map((row) =>
        String(row.registrationId) === String(updated.registrationId)
          ? { ...row, scanned: true, status: 'attended', checkInTime: updated.checkInTime }
          : row
      )
    );
    setStats((prev) => {
      const alreadyScanned = participants.some((row) => String(row.registrationId) === String(updated.registrationId) && row.scanned);
      if (alreadyScanned) return prev;
      return {
        ...prev,
        scanned: prev.scanned + 1,
        notScanned: Math.max(0, prev.notScanned - 1),
      };
    });
  };

  const submitScan = async (ticketId) => {
    const value = String(ticketId || '').trim();
    if (!value || scanBusy) return;
    setScanBusy(true);
    setScanError('');
    setScanMessage('');
    try {
      const result = await scanAttendanceTicket(eventId, value);
      applyParticipantUpdate(result.participant);
      setScanMessage(`Checked in: ${result.participant.name}`);
      setScanInput('');
    } catch (e) {
      setScanError(e || 'Failed to scan ticket.');
    } finally {
      setScanBusy(false);
    }
  };

  const startCameraScanner = async () => {
    if (!qrRef.current || cameraRunning) return;

    setScanError('');
    const scanner = new Html5Qrcode('attendance-qr-reader');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decodedText) => {
          if (decodedText) submitScan(decodedText);
        },
        () => {}
      );
      setCameraRunning(true);
    } catch {
      setScanError('Unable to start camera scanner. Check camera permission.');
    }
  };

  const stopCameraScanner = async () => {
    if (!scannerRef.current || !cameraRunning) return;
    try {
      await scannerRef.current.stop();
      await scannerRef.current.clear();
    } catch {
      // ignore
    } finally {
      scannerRef.current = null;
      setCameraRunning(false);
    }
  };

  const scanFromImageFile = async (file) => {
    if (!file) return;

    setScanError('');
    setScanMessage('');
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('attendance-qr-reader');
      }
      const decodedText = await scannerRef.current.scanFile(file, true);
      await submitScan(decodedText);
    } catch {
      setScanError('Could not read a QR code from the uploaded image.');
    }
  };

  const visibleRows = useMemo(() => {
    return participants.filter((row) => {
      const text = search.trim().toLowerCase();
      const matchesSearch =
        !text ||
        row.name.toLowerCase().includes(text) ||
        row.email.toLowerCase().includes(text) ||
        row.ticketId.toLowerCase().includes(text);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'present' && row.scanned) ||
        (statusFilter === 'absent' && !row.scanned);
      return matchesSearch && matchesStatus;
    });
  }, [participants, search, statusFilter]);

  const handleManualMark = async (registrationId) => {
    setManualBusyId(registrationId);
    setScanError('');
    setScanMessage('');
    try {
      const result = await manualMarkAttendance(eventId, registrationId, manualNote);
      applyParticipantUpdate(result.participant);
      setScanMessage(result.message);
    } catch (e) {
      setScanError(e || 'Manual override failed.');
    } finally {
      setManualBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <OrganizerSidebar />
        <div className="dashboard-content"><p>Loading attendance…</p></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container participant-dashboard-container">
      <OrganizerSidebar />
      <div className="dashboard-content participant-dashboard-content">
        <button className="oed-back-btn" onClick={() => navigate(-1)}>← Back</button>

        <section className="info-section participant-section" style={{ marginBottom: 16 }}>
          <h3>Attendance Tracking</h3>
          <p style={{ marginTop: 6, color: '#666' }}>{event?.title}</p>
          {error && <p className="error-message">{error}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(120px,1fr))', gap: 10, marginTop: 10 }}>
            <div className="info-item"><strong>Total</strong>{stats.total}</div>
            <div className="info-item"><strong>Present</strong>{stats.scanned}</div>
            <div className="info-item"><strong>Not Scanned</strong>{stats.notScanned}</div>
          </div>
        </section>

        <section className="info-section participant-section" style={{ marginBottom: 16 }}>
          <h3>QR Scanner</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            {!cameraRunning ? (
              <button className="card-button" onClick={startCameraScanner}>Start Camera Scanner</button>
            ) : (
              <button className="card-button" onClick={stopCameraScanner}>Stop Camera Scanner</button>
            )}
            <label className="card-button" style={{ cursor: 'pointer' }}>
              Upload QR Image
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => scanFromImageFile(e.target.files?.[0])}
              />
            </label>
          </div>

          <div id="attendance-qr-reader" ref={qrRef} style={{ maxWidth: 420, marginBottom: 12 }} />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="search-input"
              placeholder="Paste/scanned ticket ID"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <button className="card-button" onClick={() => submitScan(scanInput)} disabled={scanBusy}>
              {scanBusy ? 'Checking…' : 'Mark by Ticket ID'}
            </button>
          </div>

          {scanMessage && <p style={{ color: '#27ae60', fontWeight: 600, marginTop: 8 }}>{scanMessage}</p>}
          {scanError && <p className="error-message" style={{ marginTop: 8 }}>{scanError}</p>}
        </section>

        <section className="info-section participant-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Live Attendance Dashboard</h3>
            <button className="card-button" onClick={() => exportAttendanceCSV(participants, event?.title)}>
              Export Attendance CSV
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <input
              className="search-input"
              placeholder="Search name, email, ticket ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
              <option value="all">All</option>
              <option value="present">Present</option>
              <option value="absent">Not Scanned</option>
            </select>
            <input
              className="search-input"
              placeholder="Manual override note (optional)"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              style={{ maxWidth: 320 }}
            />
          </div>

          <div className="participant-table-container" style={{ marginTop: 14 }}>
            <table className="participant-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Ticket ID</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th>Manual Override</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#777' }}>No participants found.</td></tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr key={row.registrationId}>
                      <td>{row.name}</td>
                      <td>{row.email}</td>
                      <td>{row.ticketId}</td>
                      <td>{row.scanned ? 'Present' : 'Absent'}</td>
                      <td>{fmt(row.checkInTime)}</td>
                      <td>
                        <button
                          className="card-button"
                          disabled={manualBusyId === row.registrationId}
                          onClick={() => handleManualMark(row.registrationId)}
                          style={{ opacity: row.scanned ? 0.8 : 1 }}
                        >
                          {manualBusyId === row.registrationId ? 'Updating…' : row.scanned ? 'Re-Apply Present' : 'Mark Present'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
