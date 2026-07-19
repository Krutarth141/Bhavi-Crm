'use client';

import { useState } from 'react';
import { PunchLog, RosterRow } from '@/types/attendance';
import { EmployeeShift } from '@/types/settings';
import { computeAttExtras, fmtAttMin } from '@/utils/attendanceCalc';

interface Props {
    logs: PunchLog[];
    rosterRows: RosterRow[];
    shiftMap: Record<string, EmployeeShift>;
    isAdmin: boolean;
    onVerify: (id: string) => void;
}

const td = { padding: 8, fontSize: 12 } as const;
const tdC = { ...td, textAlign: 'center' as const };

const fmtM = (m?: number) => (!m ? '-' : `${Math.floor(m / 60)}h ${m % 60}m`);

export default function AttendanceTable({ logs, rosterRows, shiftMap, isAdmin, onVerify }: Props) {
    const [photo, setPhoto] = useState<string | null>(null);

    if (!logs.length && !rosterRows.length) {
        return <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>No records found</p>;
    }

    const headers = ['Employee', 'Date', 'Punch In', 'In Selfie', 'In Location', 'Punch Out', 'Out Selfie', 'Out Location', 'Actual Work (incl. OT)', 'Overtime', 'Office Hours', 'Late/Early Punch', 'Adjust Hours', 'Status', 'Action'];

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1000 }}>
                <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        {headers.map(h => <th key={h} style={{ padding: 8, textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {logs.map(l => {
                        const extras = computeAttExtras(l, shiftMap);
                        const statusBadge = l.is_late
                            ? <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>⚠️ Late</span>
                            : l.status === 'verified'
                                ? <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#d1fae5', color: '#065f46' }}>✅ OK</span>
                                : <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1e40af' }}>Active</span>;
                        return (
                            <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ ...td, fontWeight: 600 }}>{l.eng_name}</td>
                                <td style={{ ...td, whiteSpace: 'nowrap' }}>{l.punch_in_date}</td>
                                <td style={{ ...td, whiteSpace: 'nowrap' }}>{l.punch_in_time || '-'}</td>
                                <td style={tdC}>
                                    {l.punch_in_photo ? <button onClick={() => setPhoto(l.punch_in_photo!)} style={{ padding: '4px 10px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>👁️ View</button> : '-'}
                                </td>
                                <td style={tdC}>
                                    {(l.punch_in_lat && l.punch_in_lng) ? (
                                        <>
                                            <a href={`https://maps.google.com/?q=${l.punch_in_lat},${l.punch_in_lng}`} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontSize: 11 }}>📍 Map</a>
                                            {l.punch_in_accuracy != null && <span style={{ fontSize: 10, color: l.punch_in_accuracy <= 200 ? '#065f46' : '#dc2626', marginLeft: 3 }}>±{l.punch_in_accuracy}m</span>}
                                        </>
                                    ) : '-'}
                                </td>
                                <td style={{ ...td, whiteSpace: 'nowrap' }}>{l.punch_out_time || <span style={{ color: '#dc2626' }}>—</span>}</td>
                                <td style={tdC}>
                                    {l.punch_out_photo ? <button onClick={() => setPhoto(l.punch_out_photo!)} style={{ padding: '4px 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>👁️ View</button> : '-'}
                                </td>
                                <td style={tdC}>
                                    {(l.punch_out_lat && l.punch_out_lng) ? <a href={`https://maps.google.com/?q=${l.punch_out_lat},${l.punch_out_lng}`} target="_blank" rel="noreferrer" style={{ color: '#7c3aed', fontSize: 11 }}>📍 Map</a> : '-'}
                                </td>
                                <td style={{ ...tdC, fontWeight: 600, color: '#065f46' }}>{fmtM(l.working_minutes)}</td>
                                <td style={{ ...tdC, color: (l.overtime_minutes || 0) > 0 ? '#dc2626' : '#64748b' }}>{fmtM(l.overtime_minutes)}</td>
                                <td style={tdC}>{extras ? fmtAttMin(extras.officeMin) : '-'}</td>
                                <td style={tdC}>{extras && extras.shortfall > 0 ? <span style={{ color: '#dc2626' }}>{fmtAttMin(extras.shortfall)}</span> : '-'}</td>
                                <td style={tdC}>{extras && extras.adjustMin > 0 ? <span style={{ color: '#059669' }}>{fmtAttMin(extras.adjustMin)}</span> : '-'}</td>
                                <td style={td}>{statusBadge}</td>
                                <td style={tdC}>
                                    {isAdmin && l.status === 'late_pending' ? (
                                        <button onClick={() => onVerify(l.id)} style={{ padding: '3px 10px', background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>✅ Verify</button>
                                    ) : '—'}
                                </td>
                            </tr>
                        );
                    })}
                    {rosterRows.map(r => (
                        <tr key={`roster-${r.eng_id}`} style={{ borderBottom: '1px solid #f3f4f6', opacity: 0.55 }}>
                            <td style={{ ...td, fontWeight: 600 }}>{r.eng_name}</td>
                            <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.punch_in_date}</td>
                            {Array.from({ length: 11 }).map((_, i) => <td key={i} style={tdC}>-</td>)}
                            <td style={td}><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#64748b' }}>Not Punched In</span></td>
                            <td style={tdC}></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {photo && (
                <div onClick={() => setPhoto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <img src={photo} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12 }} />
                </div>
            )}
        </div>
    );
}