'use client';

import { AMCContract, isExpired, isExpiringSoon, daysUntil } from '@/types/amc';

interface Props {
    contracts: AMCContract[];
    onEdit: (c: AMCContract) => void;
    onRenew: (c: AMCContract) => void;
    onWhatsApp: (c: AMCContract) => void;
    onDelete: (id: number, name: string) => void;
}

// index.html:15692 — the "expiring" state includes a days-left count.
const StatusBadge = ({ c }: { c: AMCContract }) => {
    if (isExpired(c.amc_end)) return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#991b1b' }}>❌ Expired</span>;
    if (isExpiringSoon(c.amc_end)) return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>⚠️ Expiring in {daysUntil(c.amc_end)}d</span>;
    return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#d1fae5', color: '#065f46' }}>✅ Active</span>;
};

export default function AMCTable({ contracts, onEdit, onRenew, onWhatsApp, onDelete }: Props) {
    if (!contracts.length) {
        return <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>No AMC contracts found</p>;
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        {['Customer', 'Product', 'Serial', 'Type', 'Start', 'End', 'Amount', 'Visits', 'Status', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {contracts.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6', background: isExpired(c.amc_end) ? '#fff5f5' : isExpiringSoon(c.amc_end) ? '#fffbeb' : 'white' }}>
                            <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 600 }}>{c.customer_name}</div>
                                {c.mobile && <div style={{ fontSize: 11, color: '#6b7280' }}>{c.mobile}</div>}
                                {/* index.html:15698,15707 — address + notes lines */}
                                {c.address && <div style={{ fontSize: 11, color: '#6b7280' }}>📍 {c.address}</div>}
                                {c.notes && <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.notes}</div>}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{c.product || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace' }}>{c.serial_no || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{c.amc_type || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{c.amc_start || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: isExpired(c.amc_end) ? 700 : 'normal', color: isExpired(c.amc_end) ? '#dc2626' : 'inherit' }}>{c.amc_end || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{c.amc_amount ? `₹${Number(c.amc_amount).toLocaleString()}` : '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'center' }}>{c.visits_included ?? '—'}</td>
                            <td style={{ padding: '10px 12px' }}><StatusBadge c={c} /></td>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                <button onClick={() => onEdit(c)} style={{ padding: '3px 8px', border: '1px solid #7c3aed', color: '#7c3aed', background: '#fff', borderRadius: 5, fontSize: 11, cursor: 'pointer', marginRight: 4 }}>✏️</button>
                                <button onClick={() => onRenew(c)} style={{ padding: '3px 8px', border: '1px solid #10b981', color: '#10b981', background: '#fff', borderRadius: 5, fontSize: 11, cursor: 'pointer', marginRight: 4 }}>🔄</button>
                                <button onClick={() => onWhatsApp(c)} style={{ padding: '3px 8px', border: '1px solid #25d366', color: '#25d366', background: '#fff', borderRadius: 5, fontSize: 11, cursor: 'pointer', marginRight: 4 }}>📲</button>
                                <button onClick={() => onDelete(c.id, c.customer_name)} style={{ padding: '3px 8px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 5, cursor: 'pointer', fontSize: 11 }}>🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}