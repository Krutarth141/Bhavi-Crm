'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMyCalls } from '@/hooks/useMyCalls';
import { punchIn, punchOut, saveWorkLog, deleteWorkLog } from '@/services/myCallsService';
import { colors, styles } from '@/styles/ticketsStyles';
import PunchModal from './PunchModal';
import KmCaptureModal from './tickets/KmCaptureModal';
import { hasKmEntryToday } from '@/services/kmTrackingService';
import AIWriteButton from '@/components/shared/AIWriteButton';
import { tatLabel } from '@/utils/tatHelpers';
import { fetchWorkLogsByDate } from '@/services/myCallsService';
import WorkLogShareModal from './WorkLogShareModal';
import Modal from '@/components/Modal';
import { getAllowedStatuses, isTicketActive } from '@/types/ticketStatus';
import { updateTicketStatus } from '@/services/engineerUpdateService';

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
  const [shareLogs, setShareLogs] = useState<{ date: string; logs: typeof workLogs } | null>(null);
  const [searchDate, setSearchDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [searchResults, setSearchResults] = useState<typeof workLogs | null>(null);
  const [searching, setSearching] = useState(false);

  // Ticket list — mirrors HTML's My Calls ticket cards + Update modal
  const [ticketSearch, setTicketSearch] = useState('');
  const [expandedAddr, setExpandedAddr] = useState<string | null>(null);
  const [updateTicket, setUpdateTicket] = useState<any | null>(null);
  const [updateForm, setUpdateForm] = useState({ newStatus: '', note: '', labour: '', faultCode: '' });
  const [updateSaving, setUpdateSaving] = useState(false);

  const openTicketUpdate = (t: any) => {
    setUpdateTicket(t);
    const allowed = getAllowedStatuses(t.status, 'engineer', t.service_type, t.call_type, t.warranty_coverage);
    setUpdateForm({ newStatus: allowed[0] || '', note: '', labour: String(t.labor || t.service_charges || ''), faultCode: t.fault_code || '' });
  };

  const allowedForUpdate = updateTicket
    ? getAllowedStatuses(updateTicket.status, 'engineer', updateTicket.service_type, updateTicket.call_type, updateTicket.warranty_coverage)
    : [];

  const handleTicketUpdateSave = async () => {
    if (!updateTicket || !updateForm.newStatus) { alert('Select new status'); return; }
    setUpdateSaving(true);
    const r = await updateTicketStatus(updateTicket, updateForm.newStatus, updateForm.note, updateForm.labour, engName, updateForm.faultCode);
    setUpdateSaving(false);
    if (r.success) { setUpdateTicket(null); refetch(); }
    else alert('Error: ' + r.error);
  };

  const handleSearchLogs = async () => {
    setSearching(true);
    const r = await fetchWorkLogsByDate(engId, searchDate);
    setSearchResults(r.data || []);
    setSearching(false);
  };

  // ── Punch In / Out ───────────────────────────────────────────────────────────
  const [punchModalMode, setPunchModalMode] = useState<'in' | 'out' | null>(null);
  const [kmCaptureType, setKmCaptureType] = useState<'opening' | 'closing' | null>(null);

  const handlePunchIn = async () => {
    const hasOpening = await hasKmEntryToday(engId, 'opening');
    if (!hasOpening) { setKmCaptureType('opening'); return; }
    setPunchModalMode('in');
  };
  const handlePunchOut = async () => {
    const hasClosing = await hasKmEntryToday(engId, 'closing');
    if (!hasClosing) { setKmCaptureType('closing'); return; }
    setPunchModalMode('out');
  };

  const handlePunchSubmit = async (data: { photo: string; lat: number | null; lng: number | null; meter: string; remark?: string }) => {
    if (punchModalMode === 'in') {
      const today = new Date().toLocaleDateString('en-CA');
      const currentTime = new Date().toTimeString().slice(0, 5);
      const result = await punchIn({
        eng_id: engId,
        eng_name: engName,
        punch_in_date: today,
        punch_in_time: currentTime,
        start_meter: data.meter ? Number(data.meter) : undefined,
        photo: data.photo,
        lat: data.lat,
        lng: data.lng,
      });
      if (result.success) refetch();
      return result;
    } else {
      const currentTime = new Date().toTimeString().slice(0, 5);
      const result = await punchOut({
        eng_id: engId,
        punch_out_time: currentTime,
        end_meter: data.meter ? Number(data.meter) : undefined,
        photo: data.photo,
        lat: data.lat,
        lng: data.lng,
        lateRemark: data.remark,
      });
      if (result.success) refetch();
      return result;
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
  const activeTickets = myTickets.filter((t) => isTicketActive(t.status));
  const closedTickets = myTickets.filter((t) => !isTicketActive(t.status));
  const todayDateStr = new Date().toLocaleDateString('en-CA');
  const todayRoute = myTickets
    .filter((t) => t.planned_date === todayDateStr && isTicketActive(t.status))
    .sort((a, b) => (a.sequence_no ?? 999) - (b.sequence_no ?? 999));

  const ticketSearchQ = ticketSearch.trim().toLowerCase();
  const visibleTickets = activeTickets.filter((t) => {
    if (!ticketSearchQ) return true;
    return (t.id || '').toLowerCase().includes(ticketSearchQ)
      || (t.cname || '').toLowerCase().includes(ticketSearchQ)
      || (t.mobile || '').includes(ticketSearchQ)
      || (t.model || '').toLowerCase().includes(ticketSearchQ)
      || (t.serial || '').toLowerCase().includes(ticketSearchQ);
  }).sort((a, b) => (b.id || '').localeCompare(a.id || ''));

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

      {kmCaptureType && (
        <KmCaptureModal
          type={kmCaptureType}
          engId={engId}
          engName={engName}
          onClose={() => setKmCaptureType(null)}
          onDone={() => { const mode = kmCaptureType === 'opening' ? 'in' : 'out'; setKmCaptureType(null); setPunchModalMode(mode); }}
        />
      )}
      {punchModalMode && (
        <PunchModal mode={punchModalMode} onSubmit={handlePunchSubmit} onClose={() => setPunchModalMode(null)} />
      )}

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
      {todayRoute.length > 0 && (
        <div style={{ ...styles.card, marginBottom: '20px' }}>
          <div style={{ ...styles.sectionHeader, marginBottom: '12px' }}>
            <span style={{ ...styles.sectionTitle, fontSize: '15px' }}>🗺️ Today's Route</span>
            <span style={{ fontSize: '12px', color: colors.textMuted }}>{todayRoute.length} calls planned</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Seq #', 'Ticket ID', 'Customer', 'Mobile', 'Area', 'Status', 'TAT'].map((h) => (
                    <th key={h} style={styles.tableHeader}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayRoute.map((ticket) => {
                  const tat = tatLabel(ticket.tat_date);
                  return (
                    <tr key={ticket.id} style={styles.tableRow}>
                      <td style={{ ...styles.tableCell, textAlign: 'center' }}>{ticket.sequence_no ?? '—'}</td>
                      <td style={{ ...styles.tableCell, fontWeight: 600, color: colors.primary }}>{ticket.id}</td>
                      <td style={styles.tableCell}>{ticket.cname ?? '—'}</td>
                      <td style={styles.tableCell}>{ticket.mobile ?? '—'}</td>
                      <td style={styles.tableCell}>{ticket.area ?? '—'}</td>
                      <td style={styles.tableCell}>
                        <span style={getStatusBadgeStyle(ticket.status)}>{ticket.status}</span>
                      </td>
                      <td style={{ ...styles.tableCell, fontSize: 11, fontWeight: 700, color: tat.overdue ? '#dc2626' : '#166534' }}>
                        {tat.text}
                      </td>
                    </tr>
                  );
                })}
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

      {/* 5b. My Tickets — searchable list with Update action */}
      <div style={{ ...styles.card, marginBottom: '20px' }}>
        <div style={{ ...styles.sectionHeader, marginBottom: '12px' }}>
          <span style={{ ...styles.sectionTitle, fontSize: '15px' }}>🎫 My Calls ({visibleTickets.length})</span>
        </div>
        <input
          type="text"
          placeholder="🔍 Search ticket, customer, mobile, model, serial..."
          value={ticketSearch}
          onChange={(e) => setTicketSearch(e.target.value)}
          style={{ ...styles.formInput, marginBottom: '12px' }}
        />
        {visibleTickets.length === 0 ? (
          <div style={styles.emptyMessage}>No calls</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleTickets.map((t) => {
              const tat = tatLabel(t.tat_date);
              const addr = [t.address, t.area, t.city, t.state, t.pin].filter(Boolean).join(', ');
              return (
                <div key={t.id} style={{ border: `1.5px solid ${colors.border}`, borderRadius: '12px', padding: '14px 16px', background: '#f0f7ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: colors.primary }}>
                        {t.id}{' '}
                        {t.priority && <span style={getPriorityBadgeStyle(t.priority)}>{t.priority}</span>}
                        {t.se_call_id && (
                          <span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#92400e', marginLeft: '4px' }}>
                            SE: {t.se_call_id}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>{t.cname || '—'}</div>
                      {t.problem && (
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>🔧 {t.problem}</div>
                      )}
                    </div>
                    <span style={getStatusBadgeStyle(t.status)}>{t.status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '12px', color: colors.textMuted, marginBottom: '10px' }}>
                    <div>📱 <b style={{ color: colors.text }}>{t.model || '—'}</b></div>
                    <div>🔢 <b style={{ color: colors.text }}>{t.serial || '—'}</b></div>
                    <div>
                      📞 <a href={`tel:${t.mobile}`} style={{ color: colors.primary, fontWeight: 600 }}>{t.mobile || '—'}</a>
                      {t.mobile && (
                        <a href={`https://wa.me/91${(t.mobile || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#25D366', marginLeft: '4px' }}>💬</a>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, color: tat.overdue ? '#dc2626' : '#166534' }}>⏱ TAT: {tat.text}</div>
                    {t.alt_mobile && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        📞 Alt: <a href={`tel:${t.alt_mobile}`} style={{ color: colors.primary, fontWeight: 600 }}>{t.alt_mobile}</a>
                        <a href={`https://wa.me/91${(t.alt_mobile || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#25D366', marginLeft: '4px' }}>💬</a>
                      </div>
                    )}
                  </div>
                  {addr && (
                    <div
                      onClick={() => setExpandedAddr(expandedAddr === t.id ? null : t.id)}
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}
                    >
                      📍 Address <span style={{ fontSize: '9px' }}>▼</span>
                    </div>
                  )}
                  {addr && expandedAddr === t.id && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 10px', marginBottom: '8px', fontSize: '12px', color: '#166534' }}>
                      <div>{addr}</div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([t.address, t.area, t.city, t.state].filter(Boolean).join(', '))}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'inline-block', marginTop: '4px', color: colors.primary, fontWeight: 600, fontSize: '11px' }}
                      >
                        🗺️ Open in Maps
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => openTicketUpdate(t)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff' }}
                  >
                    ✏️ Update
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={styles.formLabel}>Task Description *</label>
            <AIWriteButton type="worklog" onInsert={(text) => setWlTask(text)} />
          </div>
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
      <div style={{ ...styles.card, marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ ...styles.sectionTitle, fontSize: '15px' }}>🗒️ Today's Work Log</div>
          {workLogs.length > 0 && (
            <button
              onClick={() => setShareLogs({ date: new Date().toLocaleDateString('en-CA'), logs: workLogs })}
              style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              📲 Share
            </button>
          )}
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

      {/* 8. Search Past Logs */}
      <div style={styles.card}>
        <div style={{ ...styles.sectionTitle, fontSize: '15px', marginBottom: '14px' }}>
          🔍 Search Past Logs
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '12px' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginBottom: '4px' }}>Date</label>
            <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} style={{ ...styles.formInput, width: '100%' }} />
          </div>
          <button onClick={handleSearchLogs} disabled={searching} style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSm, opacity: searching ? 0.6 : 1 }}>
            {searching ? 'Loading...' : '🔍 Search'}
          </button>
        </div>
        {searchResults !== null && (
          searchResults.length === 0 ? (
            <div style={styles.emptyMessage}>No logs found for this date</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: colors.primary, padding: '4px 10px', background: '#eff6ff', borderRadius: '6px' }}>
                  {new Date(searchDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — {searchResults.length} entries
                </div>
                <button
                  onClick={() => setShareLogs({ date: searchDate, logs: searchResults })}
                  style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  📲 Share
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {searchResults.map((l) => (
                  <div key={l.id} style={{ display: 'flex', gap: '10px', padding: '8px 10px', background: colors.bg, borderRadius: '8px' }}>
                    <div style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#4c1d95', background: '#ede9fe', padding: '3px 8px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
                      {l.from_time}–{l.to_time}
                    </div>
                    <div style={{ fontSize: '13px', color: colors.text }}>{l.task_description}</div>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </div>

      {shareLogs && (
        <WorkLogShareModal date={shareLogs.date} logs={shareLogs.logs} name={engName} onClose={() => setShareLogs(null)} />
      )}

      {updateTicket && (
        <Modal
          isOpen
          onClose={() => setUpdateTicket(null)}
          title={`Update — ${updateTicket.cname || ''}`}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setUpdateTicket(null)} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button
                onClick={handleTicketUpdateSave}
                disabled={updateSaving || !updateForm.newStatus}
                style={{ padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: (updateSaving || !updateForm.newStatus) ? 0.6 : 1 }}
              >
                {updateSaving ? 'Saving...' : '💾 Save Update'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allowedForUpdate.length > 0 ? (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>New Status *</label>
                  <select value={updateForm.newStatus} onChange={(e) => setUpdateForm((f) => ({ ...f, newStatus: e.target.value }))} style={styles.formInput}>
                    <option value="">Select status...</option>
                    {allowedForUpdate.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {updateForm.newStatus === 'Closed' && (
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Service / Labour ₹</label>
                    <input type="number" value={updateForm.labour} onChange={(e) => setUpdateForm((f) => ({ ...f, labour: e.target.value }))} style={styles.formInput} placeholder="0" />
                  </div>
                )}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Fault Code</label>
                  <input type="text" value={updateForm.faultCode} onChange={(e) => setUpdateForm((f) => ({ ...f, faultCode: e.target.value }))} style={styles.formInput} />
                </div>
                <div style={styles.formGroup}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={styles.formLabel}>Update Note</label>
                    <AIWriteButton type="update" onInsert={(text) => setUpdateForm((f) => ({ ...f, note: text }))} />
                  </div>
                  <textarea value={updateForm.note} onChange={(e) => setUpdateForm((f) => ({ ...f, note: e.target.value }))} rows={3} placeholder="Work done, observations..." style={{ ...styles.formInput, resize: 'vertical' }} />
                </div>
              </>
            ) : (
              <div style={{ background: '#fef3c7', borderRadius: 8, padding: 12, fontSize: 13, color: '#92400e' }}>
                ⏳ No status update available for: <strong>{updateTicket.status}</strong>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}