'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMyCalls } from '@/hooks/useMyCalls';
import { punchIn, punchOut, saveWorkLog, deleteWorkLog } from '@/services/myCallsService';
import { colors, styles } from '@/styles/ticketsStyles';

// ─── Time slots helper ──────────────────────────────────────────────────────

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 7; h <= 21; h++) {
    for (const m of ['00', '30']) {
      slots.push(`${String(h).padStart(2, '0')}:${m}`);
    }
  }
  return slots;
}
const TIME_SLOTS = generateTimeSlots();

// ─── Status badge helper ─────────────────────────────────────────────────────

function getStatusBadgeStyle(status: string): React.CSSProperties {
  const s = (status ?? '').toLowerCase();
  if (s === 'closed') return { ...styles.badge, ...styles.badgeClosed };
  if (s === 'open') return { ...styles.badge, ...styles.badgeOpen };
  if (s === 'in progress' || s === 'inprogress') return { ...styles.badge, ...styles.badgeProgress };
  if (s === 'repaired' || s === 'ready') return { ...styles.badge, ...styles.badgeApprove };
  if (s === 'on hold' || s === 'hold') return { ...styles.badge, ...styles.badgeHold };
  if (s.includes('cancel')) return { ...styles.badge, ...styles.badgeCancel };
  if (s.includes('reject')) return { ...styles.badge, ...styles.badgeReject };
  return { ...styles.badge, ...styles.badgeOpen };
}

function getPriorityBadgeStyle(priority: string): React.CSSProperties {
  const p = (priority ?? '').toLowerCase();
  if (p === 'high' || p === 'urgent') return { ...styles.badge, backgroundColor: '#fee2e2', color: '#dc2626' };
  if (p === 'medium') return { ...styles.badge, ...styles.badgeProgress };
  return { ...styles.badge, ...styles.badgeOpen };
}

function getLogTypeBadgeStyle(logType: string): React.CSSProperties {
  const t = (logType ?? 'work').toLowerCase();
  if (t === 'travel') return { ...styles.badge, backgroundColor: '#e0f2fe', color: '#0369a1' };
  if (t === 'meeting') return { ...styles.badge, backgroundColor: '#f3e8ff', color: '#7c3aed' };
  if (t === 'training') return { ...styles.badge, backgroundColor: '#fef3c7', color: '#d97706' };
  return { ...styles.badge, backgroundColor: '#d1fae5', color: '#065f46' };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MyCallsScreen() {
  const { data: session } = useSession();
  const engId = (session?.user as any)?.email ?? (session?.user as any)?.id ?? '';
  const engName = (session?.user as any)?.name ?? '';

  const { punchLog, workLogs, myTickets, myTasks, loading, error, refetch } = useMyCalls(engId, engName);

  // Work log form state
  const [wlFrom, setWlFrom] = useState('');
  const [wlTo, setWlTo] = useState('');
  const [wlTask, setWlTask] = useState('');
  const [wlLogType, setWlLogType] = useState('work');
  const [wlSubmitted, setWlSubmitted] = useState(false);
  const [wlSaving, setWlSaving] = useState(false);

  // Route table "show all" toggle
  const [showAllTickets, setShowAllTickets] = useState(false);

  // ── Punch In ───────────────────────────────────────────────────────────────
  const handlePunchIn = async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const currentTime = new Date().toTimeString().slice(0, 5);
    const meterStr = window.prompt('Enter start meter reading (optional):');
    const meter = meterStr ? meterStr.trim() : '';
    const result = await punchIn({
      eng_id: engId,
      eng_name: engName,
      log_date: today,
      punch_in_time: currentTime,
      start_meter: meter ? Number(meter) : undefined,
    });
    if (result.success) {
      refetch();
    } else {
      alert('❌ ' + result.error);
    }
  };

  // ── Punch Out ─────────────────────────────────────────────────────────────
  const handlePunchOut = async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const currentTime = new Date().toTimeString().slice(0, 5);
    const meterStr = window.prompt('Enter end meter reading (optional):');
    const meter = meterStr ? meterStr.trim() : '';
    const result = await punchOut({
      eng_id: engId,
      log_date: today,
      punch_out_time: currentTime,
      end_meter: meter ? Number(meter) : undefined,
    });
    if (result.success) {
      refetch();
    } else {
      alert('❌ ' + result.error);
    }
  };

  // ── Save Work Log ─────────────────────────────────────────────────────────
  const handleSaveWorkLog = async () => {
    setWlSubmitted(true);
    if (!wlFrom || !wlTo || !wlTask.trim()) return;
    setWlSaving(true);
    const today = new Date().toLocaleDateString('en-CA');
    const result = await saveWorkLog({
      eng_id: engId,
      eng_name: engName,
      member_role: 'Engineer',
      log_date: today,
      from_time: wlFrom,
      to_time: wlTo,
      task_description: wlTask.trim(),
      log_type: wlLogType,
    });
    setWlSaving(false);
    if (result.success) {
      setWlFrom('');
      setWlTo('');
      setWlTask('');
      setWlLogType('work');
      setWlSubmitted(false);
      refetch();
    } else {
      alert('❌ ' + result.error);
    }
  };

  // ── Delete Work Log ───────────────────────────────────────────────────────
  const handleDeleteWorkLog = async (id: string) => {
    if (!confirm('Delete this work log entry?')) return;
    const result = await deleteWorkLog(id);
    if (result.success) {
      refetch();
    } else {
      alert('❌ ' + result.error);
    }
  };

  // ── WhatsApp Share ────────────────────────────────────────────────────────
  const handleWhatsAppShare = () => {
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const punchLine = punchLog?.punch_in_time
      ? `🕐 Punch In: ${punchLog.punch_in_time}${punchLog.punch_out_time ? ` | Out: ${punchLog.punch_out_time}` : ''}`
      : '🕐 Not punched in today';
    const logLines = workLogs
      .map((l) => `• ${l.from_time}–${l.to_time}: ${l.task_description}`)
      .join('\n');
    const text = `📋 Work Log — ${today}\n${engName}\n\n${punchLine}\n\n${logLines}\n\n🎫 Tickets: ${myTickets.length} | Tasks: ${myTasks.length}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ── Derived KPIs ──────────────────────────────────────────────────────────
  const closedStatuses = ['Closed', 'Cancelled'];
  const activeTickets = myTickets.filter((t) => !closedStatuses.includes(t.status));
  const closedTickets = myTickets.filter((t) => t.status === 'Closed');

  // ── Route table slice ─────────────────────────────────────────────────────
  const visibleTickets = showAllTickets ? myTickets : myTickets.slice(0, 10);

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...styles.loadingText, fontSize: '15px', padding: '60px' }}>
        Loading your calls...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: colors.danger, fontWeight: 600 }}>
        ❌ {error}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px', backgroundColor: colors.bg, minHeight: '100vh' }}>

      {/* 1. Header */}
      <div style={{ ...styles.sectionHeader, marginBottom: '20px' }}>
        <h2 style={{ ...styles.sectionTitle, fontSize: '22px' }}>📞 My Calls</h2>
        <button
          onClick={handleWhatsAppShare}
          style={{
            ...styles.btn,
            backgroundColor: '#25d366',
            color: '#fff',
            padding: '8px 16px',
          }}
        >
          📤 WhatsApp Share
        </button>
      </div>

      {/* 2. Punch Bar */}
      <div
        style={{
          ...styles.card,
          background: 'linear-gradient(135deg, #1a56db 0%, #1240a8 100%)',
          marginBottom: '20px',
          color: '#fff',
        }}
      >
        {!punchLog?.punch_in_time ? (
          /* Not punched in */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>🟢 Not Punched In</span>
            <button
              onClick={handlePunchIn}
              style={{
                ...styles.btn,
                backgroundColor: '#0e9f6e',
                color: '#fff',
                fontSize: '14px',
              }}
            >
              ▶ Punch In
            </button>
          </div>
        ) : !punchLog.punch_out_time ? (
          /* Punched in — on duty */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                🔴 On Duty since {punchLog.punch_in_time}
              </div>
              {punchLog.start_meter !== undefined && punchLog.start_meter !== null && (
                <div style={{ fontSize: '13px', opacity: 0.85 }}>
                  Start Meter: {punchLog.start_meter}
                </div>
              )}
            </div>
            <button
              onClick={handlePunchOut}
              style={{
                ...styles.btn,
                backgroundColor: colors.danger,
                color: '#fff',
                fontSize: '14px',
              }}
            >
              ⏹ Punch Out
            </button>
          </div>
        ) : (
          /* Punched out — day complete */
          <div style={{ fontSize: '16px', fontWeight: 600 }}>
            ✅ {punchLog.punch_in_time} → {punchLog.punch_out_time}
          </div>
        )}
      </div>

      {/* 3. KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {[
          { label: 'Total Tickets', value: myTickets.length, color: colors.primary },
          { label: 'Active Tickets', value: activeTickets.length, color: colors.warning },
          { label: 'Closed Tickets', value: closedTickets.length, color: colors.success },
          { label: 'Tasks', value: myTasks.length, color: '#7c3aed' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              ...styles.card,
              textAlign: 'center',
              borderTop: `3px solid ${kpi.color}`,
            }}
          >
            <div style={{ fontSize: '26px', fontWeight: 700, color: kpi.color }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Today's Route */}
      {myTickets.length > 0 && (
        <div style={{ ...styles.card, marginBottom: '20px' }}>
          <div style={{ ...styles.sectionHeader, marginBottom: '12px' }}>
            <span style={{ ...styles.sectionTitle, fontSize: '15px' }}>🗺️ Today's Route</span>
            {myTickets.length > 10 && (
              <button
                onClick={() => setShowAllTickets((v) => !v)}
                style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSm }}
              >
                {showAllTickets ? 'Show less' : `Show all (${myTickets.length})`}
              </button>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Ticket ID', 'Customer', 'Mobile', 'Area', 'Status', 'Seq #'].map((h) => (
                    <th key={h} style={styles.tableHeader}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleTickets.map((ticket) => (
                  <tr key={ticket.id} style={styles.tableRow}>
                    <td style={{ ...styles.tableCell, fontWeight: 600, color: colors.primary }}>
                      {ticket.ticket_id ?? ticket.id}
                    </td>
                    <td style={styles.tableCell}>{ticket.customer_name ?? '—'}</td>
                    <td style={styles.tableCell}>{ticket.mobile ?? '—'}</td>
                    <td style={styles.tableCell}>{ticket.area ?? ticket.pin_code ?? '—'}</td>
                    <td style={styles.tableCell}>
                      <span style={getStatusBadgeStyle(ticket.status)}>{ticket.status}</span>
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                      {ticket.sequence_no ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Active Tasks */}
      {myTasks.length > 0 && (
        <div style={{ ...styles.card, marginBottom: '20px' }}>
          <div style={{ ...styles.sectionTitle, fontSize: '15px', marginBottom: '12px' }}>
            ✅ Active Tasks
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {myTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: colors.bg,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
                  #{task.task_no ?? task.id}
                </span>
                <span style={{ flex: 1, fontSize: '13px', color: colors.text }}>
                  {task.title ?? task.task_description ?? '—'}
                </span>
                {task.priority && (
                  <span style={getPriorityBadgeStyle(task.priority)}>{task.priority}</span>
                )}
                <span style={getStatusBadgeStyle(task.status)}>{task.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Work Log Entry Form */}
      <div style={{ ...styles.card, marginBottom: '20px' }}>
        <div style={{ ...styles.sectionTitle, fontSize: '15px', marginBottom: '14px' }}>
          ➕ Add Work Log Entry
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          {/* From Time */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>From Time</label>
            <select
              value={wlFrom}
              onChange={(e) => setWlFrom(e.target.value)}
              style={{
                ...styles.formInput,
                borderColor: wlSubmitted && !wlFrom ? colors.danger : colors.border,
              }}
            >
              <option value="">-- Select --</option>
              {TIME_SLOTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* To Time */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>To Time</label>
            <select
              value={wlTo}
              onChange={(e) => setWlTo(e.target.value)}
              style={{
                ...styles.formInput,
                borderColor: wlSubmitted && !wlTo ? colors.danger : colors.border,
              }}
            >
              <option value="">-- Select --</option>
              {TIME_SLOTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Log Type */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Log Type</label>
            <select
              value={wlLogType}
              onChange={(e) => setWlLogType(e.target.value)}
              style={styles.formInput}
            >
              <option value="work">Work</option>
              <option value="travel">Travel</option>
              <option value="meeting">Meeting</option>
              <option value="training">Training</option>
            </select>
          </div>
        </div>

        {/* Task Description */}
        <div style={{ ...styles.formGroup, marginBottom: '12px' }}>
          <label style={styles.formLabel}>Task Description *</label>
          <input
            type="text"
            placeholder="What did you work on?"
            value={wlTask}
            onChange={(e) => setWlTask(e.target.value)}
            style={{
              ...styles.formInput,
              borderColor: wlSubmitted && !wlTask.trim() ? colors.danger : colors.border,
            }}
          />
          {wlSubmitted && !wlTask.trim() && (
            <span style={{ fontSize: '11px', color: colors.danger, marginTop: '2px' }}>
              Task description is required.
            </span>
          )}
        </div>

        <button
          onClick={handleSaveWorkLog}
          disabled={wlSaving}
          style={{
            ...styles.btn,
            ...styles.btnPrimary,
            opacity: wlSaving ? 0.6 : 1,
            cursor: wlSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {wlSaving ? '⏳ Saving...' : '💾 Save Entry'}
        </button>
      </div>

      {/* 7. Today's Work Log List */}
      <div style={styles.card}>
        <div style={{ ...styles.sectionTitle, fontSize: '15px', marginBottom: '14px' }}>
          🗒️ Today's Work Log
        </div>
        {workLogs.length === 0 ? (
          <div style={styles.emptyMessage}>No work log entries for today</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {workLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: colors.bg,
                  flexWrap: 'wrap',
                }}
              >
                {/* Time range badge */}
                <span
                  style={{
                    ...styles.badge,
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    fontWeight: 700,
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {log.from_time} – {log.to_time}
                </span>

                {/* Log type badge */}
                <span style={getLogTypeBadgeStyle(log.log_type ?? 'work')}>
                  {log.log_type ?? 'work'}
                </span>

                {/* Description */}
                <span style={{ flex: 1, fontSize: '13px', color: colors.text }}>
                  {log.task_description}
                </span>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteWorkLog(log.id)}
                  title="Delete entry"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: colors.danger,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
