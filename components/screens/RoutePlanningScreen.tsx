'use client';

import { useState } from 'react';
import { useEngineers } from '@/hooks/useEngineers';
import { Ticket } from '@/types/tickets';
import { fetchEngineerActiveTickets, saveRoutePlan } from '@/services/routePlanningService';

const todayStr = () => new Date().toLocaleDateString('en-CA');

const badgeStyle = (bg: string, color: string): React.CSSProperties => ({ background: bg, color, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, display: 'inline-block' });

// index.html:3102-3106 — Urgent/High are font-weight:700, the default Normal badge is font-weight:600.
const priorityBadge = (p?: string) => {
    if (p === 'Urgent') return <span style={badgeStyle('#fef2f2', '#dc2626')}>🔴 Urgent</span>;
    if (p === 'High') return <span style={badgeStyle('#fef9c3', '#d97706')}>🟡 High</span>;
    return <span style={{ ...badgeStyle('#f1f5f9', '#64748b'), fontWeight: 600 }}>⚪ Normal</span>;
};

// Matches HTML's shared `.badge` class (index.html:50): padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600.
const statusBadgeStyle = (bg: string, color: string, border?: string): React.CSSProperties => ({
    background: bg,
    color,
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    display: 'inline-block',
    ...(border ? { border } : {}),
});

const moveBtnStyle: React.CSSProperties = { background: '#f1f5f9', border: '1px solid #e5e7eb', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', fontSize: 12, marginRight: 4 };

// Mirrors HTML's statusBadge() color map (index.html:3098-3101); badge-msc and
// badge-delivery (index.html:263-264) additionally carry a 1px border.
const STATUS_COLORS: Record<string, [string, string, string?]> = {
    'Pending Customer Arrival': ['#ffe4e6', '#be123c'],
    'Pending Allocation': ['#ffe4e6', '#be123c'],
    Assigned: ['#dbeafe', '#1d4ed8'],
    'In Progress': ['#fef3c7', '#d97706'],
    Closed: ['#d1fae5', '#065f46'],
    Delivered: ['#d1fae5', '#065f46'],
    'Pending Customer Approval': ['#ffe4e6', '#be123c'],
    'Customer Approved': ['#d1fae5', '#065f46'],
    'Customer Reject': ['#fef2f2', '#dc2626'],
    'Call Cancel': ['#f1f5f9', '#475569'],
    'Pending Parts': ['#ffe4e6', '#be123c'],
    'Pending Engineer Stock': ['#ffe4e6', '#be123c'],
    'Pending Repair Carry In': ['#fef3c7', '#d97706'],
    'Pending Repair On Site': ['#fef3c7', '#d97706'],
    Repaired: ['#fef3c7', '#d97706'],
    'Sent to MSC': ['#dbeafe', '#1e40af', '1px solid #bfdbfe'],
    'Pending for Delivery': ['#dcfce7', '#166534', '1px solid #86efac'],
    'Resolved By Phone': ['#d1fae5', '#065f46'],
};
const statusBadge = (s?: string) => {
    const [bg, color, border] = STATUS_COLORS[s || ''] || ['#dbeafe', '#1d4ed8'];
    return <span style={statusBadgeStyle(bg, color, border)}>{s || 'Open'}</span>;
};

export default function RoutePlanningScreen() {
    const { activeEngineers } = useEngineers();
    const [engId, setEngId] = useState('');
    const [date, setDate] = useState(todayStr());
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const handleLoad = async () => {
        if (!engId) { alert('Please select an engineer'); return; }
        if (!date) { alert('Please select a date'); return; }
        setLoading(true);
        const data = await fetchEngineerActiveTickets(engId);
        const forDate = data.filter((t) => t.planned_date === date).sort((a, b) => (a.sequence_no || 999) - (b.sequence_no || 999));
        const other = data.filter((t) => t.planned_date !== date);
        setTickets([...forDate, ...other]);
        setLoaded(true);
        setLoading(false);
        setSaveFailed(false);
    };

    const move = (id: string, dir: number) => {
        setTickets((prev) => {
            const arr = [...prev];
            const idx = arr.findIndex((t) => t.id === id);
            if (idx === -1) return prev;
            const ni = idx + dir;
            if (ni < 0 || ni >= arr.length) return prev;
            [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
            return arr;
        });
    };

    const reorder = (id: string, newSeqStr: string) => {
        setTickets((prev) => {
            const arr = [...prev];
            const idx = arr.findIndex((t) => t.id === id);
            if (idx === -1) return prev;
            const ns = parseInt(newSeqStr, 10) - 1;
            if (isNaN(ns) || ns < 0 || ns >= arr.length) return prev;
            const [item] = arr.splice(idx, 1);
            arr.splice(ns, 0, item);
            return arr;
        });
    };

    const handleSave = async () => {
        if (!tickets.length || !date) { alert('Please select an engineer and date to load calls first'); return; }
        setSaving(true);
        const r = await saveRoutePlan(tickets, date);
        setSaving(false);
        if (r.success) {
            setSaveFailed(false);
            alert('✅ Route saved!\nEngineer will see calls in this sequence.');
        } else {
            // index.html:27130-27131 — on error the button label reverts to plain
            // "💾 Save Route" (no date suffix), it only regains the suffix via a
            // fresh render (i.e. the next successful load/save).
            setSaveFailed(true);
            alert('Error: ' + r.error);
        }
    };

    const dateLabel = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 14 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🗺️ Route Planning</h1>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 10 }}>Set the call sequence for the engineer</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Engineer</label>
                        <select value={engId} onChange={(e) => setEngId(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%' }}>
                            <option value="">-- Select Engineer --</option>
                            {activeEngineers.map((e) => (<option key={e.id} value={e.user_id}>{e.name}</option>))}
                        </select>
                    </div>
                    <div style={{ minWidth: 160 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <button onClick={handleLoad} disabled={loading} style={{ padding: '8px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                        {loading ? 'Loading...' : '📥 Load Calls'}
                    </button>
                </div>
            </div>

            {loaded && (
                tickets.length === 0 ? (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', padding: 30, color: '#6b7280' }}>No active calls for this engineer</div>
                ) : (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>Active Calls ({tickets.length})</div>
                                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>▲▼ to set order → Save → Engineer will see calls in this sequence</div>
                            </div>
                            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                                {saving ? 'Saving...' : saveFailed ? '💾 Save Route' : `💾 Save Route — ${dateLabel}`}
                            </button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ width: 55, textAlign: 'center', padding: 8 }}># Seq</th>
                                        <th style={{ padding: 8, textAlign: 'left' }}>Ticket / Customer</th>
                                        <th style={{ padding: 8, textAlign: 'left' }}>Area</th>
                                        <th style={{ padding: 8, textAlign: 'left' }}>Model</th>
                                        <th style={{ padding: 8 }}>Priority</th>
                                        <th style={{ padding: 8 }}>TAT</th>
                                        <th style={{ padding: 8 }}>Status</th>
                                        <th style={{ width: 70, padding: 8 }}>Move</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map((t, i) => {
                                        let tatHtml: React.ReactNode = '—';
                                        if (t.tat_date) {
                                            const hrs = Math.round((new Date(t.tat_date).getTime() - Date.now()) / 3600000);
                                            tatHtml = hrs < 0
                                                ? <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 11 }}>⚠️ Overdue</span>
                                                : hrs < 4
                                                    ? <span style={{ color: '#ca8a04', fontWeight: 700, fontSize: 11 }}>⏰ {hrs}h</span>
                                                    : <span style={{ color: '#15803d', fontSize: 11 }}>✅ {hrs}h</span>;
                                        }
                                        const isPlanned = t.planned_date === date;
                                        const isPendingParts = t.status === 'Pending Parts' || t.status === 'Pending Engineer Stock';
                                        const isPartsArrived = t.status === 'Pending Repair On Site';
                                        const rowBg = isPendingParts ? 'repeating-linear-gradient(135deg,#f3f4f6,#f3f4f6 6px,#e5e7eb 6px,#e5e7eb 12px)' : isPartsArrived ? '#dcfce7' : isPlanned ? '#eff6ff' : undefined;
                                        return (
                                            <tr key={t.id} style={{ background: rowBg, borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ textAlign: 'center', padding: 8 }}>
                                                    <input
                                                        key={`${t.id}-seq-${i}`}
                                                        type="number"
                                                        defaultValue={i + 1}
                                                        min={1}
                                                        max={tickets.length}
                                                        onBlur={(e) => reorder(t.id, e.target.value)}
                                                        style={{ width: 46, border: '1px solid #cbd5e1', borderRadius: 6, padding: 4, fontSize: 13, textAlign: 'center' }}
                                                    />
                                                </td>
                                                <td style={{ padding: 8 }}>
                                                    <b style={{ fontSize: 13 }}>{t.id}</b>
                                                    {isPlanned && <span style={{ ...badgeStyle('#dbeafe', '#1d4ed8'), marginLeft: 4 }}>PLANNED</span>}
                                                    <br /><span style={{ fontSize: 12 }}>{t.cname || '-'}</span>
                                                    <br /><span style={{ fontSize: 11, color: '#6b7280' }}>📞 {t.mobile || '-'}</span>
                                                </td>
                                                <td style={{ padding: 8, fontSize: 12 }}>{t.area || t.city || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                                                <td style={{ padding: 8, fontSize: 12 }}>{t.model || '-'}</td>
                                                <td style={{ padding: 8, textAlign: 'center' }}>{priorityBadge(t.priority)}</td>
                                                <td style={{ padding: 8, textAlign: 'center' }}>{tatHtml}</td>
                                                <td style={{ padding: 8, textAlign: 'center' }}>
                                                    {statusBadge(t.status)}
                                                    {isPendingParts && <span style={{ ...badgeStyle('#fee2e2', '#b91c1c'), marginLeft: 4, fontSize: 9 }} title="Parts not ready — do not schedule">⛔ HOLD</span>}
                                                    {isPartsArrived && <span style={{ ...badgeStyle('#bbf7d0', '#15803d'), marginLeft: 4, fontSize: 9 }}>✅ READY</span>}
                                                </td>
                                                <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                                                    <button onClick={() => move(t.id, -1)} title="Up" style={moveBtnStyle}>▲</button>
                                                    <button onClick={() => move(t.id, 1)} title="Down" style={moveBtnStyle}>▼</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}