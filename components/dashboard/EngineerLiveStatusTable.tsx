'use client';

import { useEffect, useState } from 'react';
import { fetchEngineerLiveStatus, EngineerLiveStatusRow } from '@/services/dashboardService';

export default function EngineerLiveStatusTable() {
    const [rows, setRows] = useState<EngineerLiveStatusRow[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        setRows(await fetchEngineerLiveStatus());
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>👷 Engineer Live Status</h2>
                <button onClick={load} style={{ padding: '6px 12px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🔄 Refresh</button>
            </div>
            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>Loading...</p> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr>
                                {['Engineer', 'Status', 'Current Call', 'Area', 'Time', '📍 Location'].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No data</td></tr>
                            ) : rows.map((r, i) => (
                                <tr key={i}>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{r.name}</td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ background: r.statusColor.bg, color: r.statusColor.color, padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>{r.statusLabel}</span>
                                    </td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: 12, maxWidth: 220 }}>{r.callInfo}</td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>{r.area}</td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: 11, color: '#9ca3af' }}>{r.since}</td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                                        {r.locationUrl ? <a href={r.locationUrl} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 600 }}>📍 {r.locationLabel}</a> : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}