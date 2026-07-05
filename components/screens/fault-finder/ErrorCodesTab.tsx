'use client';

import { ModelError } from '@/types/faultFinder';

interface Props {
    errors: ModelError[];
}

const SeverityBadge = ({ s }: { s?: string }) => {
    const map: Record<string, { bg: string; color: string }> = {
        Low: { bg: '#d1fae5', color: '#065f46' }, Medium: { bg: '#fef3c7', color: '#92400e' },
        High: { bg: '#fee2e2', color: '#991b1b' }, Critical: { bg: '#fce7f3', color: '#9d174d' },
    };
    const st = map[s || ''] || { bg: '#f3f4f6', color: '#374151' };
    return s ? <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{s}</span> : null;
};

export default function ErrorCodesTab({ errors }: Props) {
    if (!errors.length) {
        return <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>No error codes found</p>;
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        {['#', 'Brand', 'Model', 'Error Code', 'Support Code', 'Cause', 'Remedy', 'Severity'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {errors.map((e, i) => (
                        <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>{i + 1}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{e.brand || '—'}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{e.model_name || '—'}</td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>{e.error_code || '—'}</td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{e.support_code || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', maxWidth: 180 }}>{e.cause || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#059669', maxWidth: 180 }}>{e.remedy || '—'}</td>
                            <td style={{ padding: '10px 12px' }}><SeverityBadge s={e.severity} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}