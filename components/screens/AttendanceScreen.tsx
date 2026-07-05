'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAttendance } from '@/hooks/useAttendance';
import AttendanceTable from '@/components/screens/attendance/AttendanceTable';
import { exportPunchLogsExcel } from '@/services/attendanceService';
import { PunchLog } from '@/types/attendance';

export default function AttendanceScreen() {
    const { data: session } = useSession();
    const adminName = (session?.user as any)?.name ?? 'Admin';

    const { logs, loading, error, engineers, refetch, verify } = useAttendance();
    const [dateFilter, setDateFilter] = useState('');
    const [engFilter, setEngFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [displayed, setDisplayed] = useState<PunchLog[]>(logs);

    useEffect(() => {
        let data = [...logs];
        if (dateFilter) data = data.filter(l => l.punch_in_date === dateFilter);
        if (engFilter) data = data.filter(l => l.eng_name === engFilter);
        if (statusFilter) data = data.filter(l => l.status === statusFilter);
        setDisplayed(data);
    }, [logs, dateFilter, engFilter, statusFilter]);

    const handleVerify = async (id: string) => {
        const remark = prompt('Verification remark (optional):');
        if (remark === null) return;
        const result = await verify(id, remark, adminName);
        if (!result.success) alert('Error: ' + result.error);
    };

    const totalLogs = logs.length;
    const latePending = logs.filter(l => l.status === 'late_pending').length;
    const verified = logs.filter(l => l.status === 'verified').length;
    const active = logs.filter(l => !l.punch_out_time).length;

    return (
        <div style={{ padding: '20px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🗓️ Attendance ({logs.length})</h1>
                <button
                    onClick={() => exportPunchLogsExcel(displayed)}
                    style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
                >
                    📊 Excel Export
                </button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Logs', value: totalLogs, color: '#185FA5' },
                    { label: '🟢 Active', value: active, color: '#059669' },
                    { label: '⚠️ Late Pending', value: latePending, color: '#d97706' },
                    { label: '✅ Verified', value: verified, color: '#065f46' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                <select value={engFilter} onChange={e => setEngFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}>
                    <option value="">All Engineers</option>
                    {engineers.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}>
                    <option value="">All Statuses</option>
                    <option value="active">🟢 Active</option>
                    <option value="late_pending">⚠️ Late Pending</option>
                    <option value="verified">✅ Verified</option>
                </select>
                <button onClick={() => { setDateFilter(''); setEngFilter(''); setStatusFilter(''); }} style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, background: 'transparent', cursor: 'pointer' }}>🔄 Reset</button>
                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>{displayed.length} / {logs.length} records</span>
            </div>

            {/* Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>Loading...</p>
                ) : (
                    <AttendanceTable logs={displayed} onVerify={handleVerify} />
                )}
            </div>
        </div>
    );
}