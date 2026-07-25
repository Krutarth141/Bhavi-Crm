'use client';
import { useEffect, useState } from 'react';
import { InventoryItem } from '@/types/inventory';
import { EngMovement } from '@/types/engParts';
import { fetchWarrantyPending, markWarrantyReceived, WarrantyTicketRow } from '@/services/engPartsService';

interface Props {
    inventory: InventoryItem[];
}

const kpiCard = (borderColor: string) => ({ padding: 12, border: `1px solid ${borderColor}`, borderRadius: 8, background: '#fff', textAlign: 'center' as const });
const kpiLabel = { fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const };
const kpiValue = (color: string) => ({ fontSize: 22, fontWeight: 800, color, marginTop: 4 });

export default function WarrantyPendingTab({ inventory }: Props) {
    const [showAll, setShowAll] = useState(false);
    const [used, setUsed] = useState<EngMovement[]>([]);
    const [ticketRows, setTicketRows] = useState<WarrantyTicketRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [checked, setChecked] = useState<string[]>([]);

    const load = async () => {
        setLoading(true);
        const r = await fetchWarrantyPending(showAll, inventory);
        setUsed(r.used);
        setTicketRows(r.ticketRows);
        setChecked([]);
        setLoading(false);
    };

    useEffect(() => { load(); }, [showAll]);

    const today = new Date();
    const partLabel = (partId: string) => {
        const p = inventory.find(i => i.id === partId);
        return p ? `${p.part_code || p.item_name} — ${p.item_name}` : 'Unknown Part';
    };
    const diffDays = (dateStr?: string) => dateStr ? Math.floor((today.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const statusInfo = (m: EngMovement) => {
        const status = m.warranty_status || 'PENDING';
        const d = diffDays(m.created_at);
        const isOverdue = (status === 'PENDING' || status === 'PARTIAL' || status === 'WITH_ENGINEER') && d >= 7;
        if (status === 'RECEIVED') return { bg: '#f0fdf4', color: '#059669', label: '✅ Received / Complete', rowBg: '#f0fdf4' };
        if (status === 'WITH_ENGINEER') return { bg: '#e0f2fe', color: '#0369a1', label: `${isOverdue ? '🚨' : '🔧'} With Engineer${isOverdue ? ` (${d}d)` : ''}`, rowBg: '#e0f2fe' };
        if (status === 'PARTIAL') return { bg: '#fff7ed', color: '#ea580c', label: `${isOverdue ? '🚨' : '🔶'} Partial (${m.warranty_received_qty || 0}/${m.qty})${isOverdue ? ` ${d}d` : ''}`, rowBg: '#fff7ed' };
        if (isOverdue) return { bg: '#fef2f2', color: '#dc2626', label: `🚨 Overdue (${d}d)`, rowBg: '#fef2f2' };
        return { bg: '#fefce8', color: '#d97706', label: `⏳ Pending Canon (${d}d)`, rowBg: '#fff' };
    };

    const total = used.length + ticketRows.length;
    const received = used.filter(m => m.warranty_status === 'RECEIVED').length;
    const partial = used.filter(m => m.warranty_status === 'PARTIAL').length;
    const pending = (used.length - received - partial) + ticketRows.length;
    const overdue = used.filter(m => (m.warranty_status === 'PENDING' || m.warranty_status === 'PARTIAL' || !m.warranty_status) && diffDays(m.created_at) >= 7).length
        + ticketRows.filter(r => diffDays(r.created_at) >= 7).length;

    const toggleCheck = (id: string) => setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleMarkReceived = async () => {
        if (!checked.length) { alert('Please select at least one row to mark as received.'); return; }
        if (!confirm(`Mark ${checked.length} selected entry/entries as Received?\n\nNo stock changes — only tracking status will update.`)) return;
        await markWarrantyReceived(checked);
        await load();
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading...</div>;

    if (!used.length && !ticketRows.length) {
        return (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>No pending warranty parts.</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>All parts have been received back.</div>
                <div style={{ marginTop: 14 }}>
                    <button onClick={() => setShowAll(true)} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>📋 Show All History</button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, flex: 1 }}>
                    <div style={kpiCard('#e5e7eb')}><div style={kpiLabel}>{showAll ? 'Total' : 'Pending'} Parts</div><div style={kpiValue('#1e293b')}>{total}</div></div>
                    <div style={kpiCard('#d97706')}><div style={kpiLabel}>⏳ Pending Return</div><div style={kpiValue('#d97706')}>{pending}</div></div>
                    <div style={kpiCard('#ea580c')}><div style={kpiLabel}>🔶 Partial</div><div style={kpiValue('#ea580c')}>{partial}</div></div>
                    <div style={kpiCard('#dc2626')}><div style={kpiLabel}>🚨 Overdue 7+ days</div><div style={kpiValue('#dc2626')}>{overdue}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleMarkReceived} disabled={!checked.length} style={{ padding: '7px 14px', background: checked.length ? '#059669' : '#e5e7eb', color: checked.length ? '#fff' : '#9ca3af', border: 'none', borderRadius: 6, cursor: checked.length ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        ✅ Mark Received ({checked.length})
                    </button>
                    <button onClick={() => setShowAll(!showAll)} style={{ padding: '7px 14px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {showAll ? '⏳ Pending Only' : '📋 Show All History'}
                    </button>
                </div>
            </div>

            {overdue > 0 && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                    🚨 {overdue} warranty part(s) overdue — not received from company within 7 days. Check and follow up.
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            {['', 'Date Used', 'SE Call ID', 'Part', 'Qty', 'Engineer', 'Status', 'Received On'].map(h => (
                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: '#64748b' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {used.map(m => {
                            const info = statusInfo(m);
                            const receivedQty = m.warranty_received_qty || 0;
                            const remainingQty = m.qty - receivedQty;
                            const seDisplay = m.se_call_id_full || m.job_sheet || '—';
                            return (
                                <tr key={m.id} style={{ background: info.rowBg }}>
                                    <td style={{ padding: '10px 12px' }}>
                                        <input type="checkbox" checked={checked.includes(m.id)} onChange={() => toggleCheck(m.id)} />
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>{seDisplay}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600 }}>{partLabel(m.part_id)}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'center' }}>
                                        {m.warranty_status === 'PARTIAL'
                                            ? <><span style={{ fontWeight: 700 }}>{m.qty}</span><br /><span style={{ fontSize: 10, color: '#d97706' }}>Rcvd: {receivedQty} / Pending: {remainingQty}</span></>
                                            : m.qty}
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>
                                        {m.from_owner || '—'}
                                        {m.to_owner && <><br /><span style={{ fontSize: 10, color: '#0369a1' }}>👷 {m.to_owner}</span></>}
                                    </td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <span style={{ background: info.bg, color: info.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{info.label}</span>
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{m.warranty_received_at ? new Date(m.warranty_received_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                </tr>
                            );
                        })}
                        {ticketRows.map((r, i) => {
                            const d = diffDays(r.created_at);
                            const isOverdue = d >= 7;
                            return (
                                <tr key={`t-${r.ticket_id}-${i}`} style={{ background: isOverdue ? '#fef9f0' : '#fffbeb' }}>
                                    <td style={{ padding: '10px 12px' }} />
                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>{r.se_call_id || r.ticket_id}<br /><span style={{ fontSize: 10, color: '#64748b' }}>{r.ticket_id}</span></td>
                                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600 }}>{r.spare_code} — {r.spare_name}<br /><span style={{ fontSize: 10, color: '#64748b' }}>{r.cname || ''}  |  {r.model || ''}</span></td>
                                    <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'center' }}>{r.qty}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{r.assigned_name || '—'}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{isOverdue ? '🚨' : '⏳'} From Ticket{isOverdue ? ` (${d}d)` : ''}</span>
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#94a3b8' }}>—</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {ticketRows.length > 0 && (
                <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginTop: 10, fontSize: 12, color: '#92400e' }}>
                    ⚠️ <b>{ticketRows.length} part(s)</b> from warranty tickets are not yet formally tracked in movements. Use <b>Record Usage</b> or <b>Direct Warranty Issue</b> to add them properly for future tracking.
                </div>
            )}
        </div>
    );
}