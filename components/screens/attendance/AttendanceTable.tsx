'use client';

import { PunchLog } from '@/types/attendance';

interface Props {
    logs: PunchLog[];
    onVerify: (id: string) => void;
}

const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
        late_pending: { bg: '#fef3c7', color: '#92400e', label: '⚠️ Late' },
        verified: { bg: '#d1fae5', color: '#065f46', label: '✅ Verified' },
        active: { bg: '#dbeafe', color: '#1e40af', label: '🟢 Active' },
    };
    const s = map[status] || { bg: '#f3f4f6', color: '#374151', label: status };
    return (
        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
            {s.label}
        </span>
    );
};

export default function AttendanceTable({ logs, onVerify }: Props) {
    if (!logs.length) {
        return <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>No punch logs found</p>;
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        {['Engineer', 'Date', 'Punch In', 'Punch Out', 'Meter Start', 'Meter End', 'Status', 'Remark', 'Action'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {logs.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6', background: l.status === 'late_pending' ? '#fffbeb' : 'white' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{l.eng_name || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>{l.punch_in_date || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{l.punch_in_time || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>
                                {l.punch_out_time || <span style={{ color: '#dc2626', fontSize: 11 }}>Not Out</span>}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{l.start_meter || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{l.end_meter || '—'}</td>
                            <td style={{ padding: '10px 12px' }}><StatusBadge status={l.status} /></td>
                            <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280' }}>{l.admin_remark || '—'}</td>
                            <td style={{ padding: '10px 12px' }}>
                                {l.status === 'late_pending' ? (
                                    <button
                                        onClick={() => onVerify(l.id)}
                                        style={{ padding: '3px 10px', background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                                    >
                                        ✅ Verify
                                    </button>
                                ) : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}