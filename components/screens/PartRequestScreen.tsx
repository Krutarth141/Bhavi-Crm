'use client';

import { useState } from 'react';
import { usePartRequests } from '@/hooks/usePartRequests';
import { PartRequest, PartRequestFilter } from '@/types/partRequest';

export default function PartRequestScreen() {
    const [filter, setFilter] = useState<PartRequestFilter>('pending');
    const { requests, loading, error, pending, approved, rejected, approve, reject, refetch } = usePartRequests(filter);
    const [processing, setProcessing] = useState<string | null>(null);

    const handleApprove = async (req: PartRequest) => {
        if (!confirm(`Approve ${req.qty} × ${req.part_name} for ${req.eng_name}?`)) return;
        setProcessing(req.id);
        const r = await approve(req);
        if (!r.success) alert('Error: ' + r.error);
        setProcessing(null);
    };

    const handleReject = async (req: PartRequest) => {
        const reason = prompt('Rejection reason (optional):');
        if (reason === null) return;
        setProcessing(req.id);
        const r = await reject(req.id, reason || undefined);
        if (!r.success) alert('Error: ' + r.error);
        setProcessing(null);
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🧰 Part Requests</h1>
                <button onClick={refetch} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'white' }}>🔄 Refresh</button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: '⏳ Pending', value: pending, color: '#d97706' },
                    { label: '✅ Approved', value: approved, color: '#059669' },
                    { label: '❌ Rejected', value: rejected, color: '#dc2626' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {([
                    { id: 'pending', label: '⏳ Pending' },
                    { id: 'approved', label: '✅ Approved' },
                    { id: 'rejected', label: '❌ Rejected' },
                    { id: 'all', label: 'All' },
                ] as { id: PartRequestFilter; label: string }[]).map(tab => (
                    <button key={tab.id} onClick={() => setFilter(tab.id)} style={{ padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: filter === tab.id ? '#185FA5' : 'white', color: filter === tab.id ? '#fff' : '#374151', fontWeight: filter === tab.id ? 600 : 400 }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                    : requests.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No {filter} requests</p>
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            {['Engineer', 'Part', 'Qty', 'Ticket', 'Note', 'Requested', 'Status', 'Action'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map(r => {
                                            const isPending = r.status === 'pending';
                                            const isProcessing = processing === r.id;
                                            return (
                                                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: isPending ? '#fffbeb' : 'white' }}>
                                                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.eng_name}</td>
                                                    <td style={{ padding: '10px 12px' }}>{r.part_name || r.part_id || '—'}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.qty || 1}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace' }}>{r.ticket_id || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{r.note || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: r.status === 'pending' ? '#fef3c7' : r.status === 'approved' ? '#d1fae5' : '#fee2e2', color: r.status === 'pending' ? '#92400e' : r.status === 'approved' ? '#065f46' : '#991b1b' }}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        {isPending ? (
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                <button onClick={() => handleApprove(r)} disabled={isProcessing} style={{ padding: '4px 10px', background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, opacity: isProcessing ? 0.5 : 1 }}>✅ Approve</button>
                                                                <button onClick={() => handleReject(r)} disabled={isProcessing} style={{ padding: '4px 10px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, opacity: isProcessing ? 0.5 : 1 }}>❌ Reject</button>
                                                            </div>
                                                        ) : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
            </div>
        </div>
    );
}