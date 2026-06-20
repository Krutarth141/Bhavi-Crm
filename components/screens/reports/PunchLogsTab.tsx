'use client';

import { useState, useMemo, useCallback } from 'react';
import { PunchLog } from '@/types/reports';

interface PunchLogsTabProps {
    logs: PunchLog[];
    loading: boolean;
    onVerify: (id: string, adminRemark: string, verifiedBy: string) => Promise<void>;
    currentUserName: string;
}

export default function PunchLogsTab({ logs, loading, onVerify, currentUserName }: PunchLogsTabProps) {
    const [filterDate, setFilterDate] = useState('');
    const [filterEng, setFilterEng] = useState('');
    const [verifying, setVerifying] = useState<string | null>(null);

    const engineers = useMemo(() => [...new Set(logs.map((l) => l.eng_name).filter(Boolean))], [logs]);

    const filteredLogs = useMemo(() =>
        logs.filter((l) =>
            (!filterDate || l.punch_in_date === filterDate) &&
            (!filterEng || l.eng_name === filterEng)
        ),
        [logs, filterDate, filterEng]
    );

    const pending = logs.filter((l) => l.status === 'late_pending');
    const verified = logs.filter((l) => l.status === 'verified');

    const handleVerify = useCallback(async (log: PunchLog) => {
        const isNextDay = log.is_next_day;
        const info = [
            isNextDay ? '⚠️ NEXT DAY PUNCH OUT' : '⚠️ LATE PUNCH OUT',
            `Engineer: ${log.eng_name}`,
            `Punch In: ${log.punch_in_date} ${log.punch_in_time}`,
            `Punch Out: ${log.punch_out_date || log.punch_in_date} ${log.punch_out_time}`,
            `Engineer Reason: ${log.late_remark || '—'}`,
            '',
            'Admin Remark (approval note):',
        ].join('\n');

        const remark = window.prompt(info);
        if (remark === null) return;

        setVerifying(log.id);
        try {
            await onVerify(log.id, remark || 'Approved', currentUserName);
            alert('✅ Approved! Punch log verified.');
        } catch (e: unknown) {
            alert('Error: ' + (e instanceof Error ? e.message : 'Unknown error'));
        } finally {
            setVerifying(null);
        }
    }, [onVerify, currentUserName]);

    const handleExcel = useCallback(async () => {
        if (!logs.length) return;
        const XLSX = await import('xlsx');
        const data = logs.map((l) => ({
            'Engineer': l.eng_name,
            'Date': l.punch_in_date,
            'Punch In': l.punch_in_time || '-',
            'Punch Out': l.punch_out_time || '-',
            'Meter Start': l.start_meter || '-',
            'Meter End': l.end_meter || '-',
            'Status': l.status,
            'Late Reason': l.late_remark || '',
            'Admin Remark': l.admin_remark || '',
            'Verified By': l.verified_by || '',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Punch Logs');
        XLSX.writeFile(wb, 'punch_logs.xlsx');
    }, [logs]);

    if (loading) return <p className="loading">Loading punch logs...</p>;

    if (!logs.length) {
        return <div className="alert alert-info">🕐 No punch logs yet. Data will appear once engineers punch in/out.</div>;
    }

    return (
        <div>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
                <div className="kpi-card">
                    <div className="kpi-value">{logs.length}</div>
                    <div className="kpi-label">Total Logs</div>
                </div>
                <div className="kpi-card" style={{ borderColor: 'var(--danger)' }}>
                    <div className="kpi-value" style={{ color: 'var(--danger)' }}>{pending.length}</div>
                    <div className="kpi-label">⚠️ Late Pending</div>
                </div>
                <div className="kpi-card" style={{ borderColor: 'var(--success)' }}>
                    <div className="kpi-value" style={{ color: 'var(--success)' }}>{verified.length}</div>
                    <div className="kpi-label">✅ Verified</div>
                </div>
            </div>

            {/* Table card */}
            <div className="card">
                <div className="section-header" style={{ marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Punch Logs</h3>
                    <button className="btn btn-success btn-sm" onClick={handleExcel}>📊 Excel</button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        style={fieldStyle}
                    />
                    <select
                        value={filterEng}
                        onChange={(e) => setFilterEng(e.target.value)}
                        style={fieldStyle}
                    >
                        <option value="">All Engineers</option>
                        {engineers.map((n) => <option key={n}>{n}</option>)}
                    </select>
                    {(filterDate || filterEng) && (
                        <button className="btn btn-outline btn-sm" onClick={() => { setFilterDate(''); setFilterEng(''); }}>
                            Clear
                        </button>
                    )}
                </div>

                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Engineer</th>
                                <th>Punch In</th>
                                <th>Punch Out</th>
                                <th>Meter</th>
                                <th>Status</th>
                                <th>Reason</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((l) => {
                                const isLate = l.status === 'late_pending';
                                const isNextDay = l.is_next_day;

                                let statusBadge: React.ReactNode;
                                if (isLate) {
                                    statusBadge = <span className="badge badge-pending">{isNextDay ? '⚠️ Next Day' : '⚠️ Late'}</span>;
                                } else if (l.status === 'verified') {
                                    statusBadge = <span className="badge badge-closed">✅ Verified</span>;
                                } else {
                                    statusBadge = <span className="badge badge-open">Active</span>;
                                }

                                const punchOutCell = l.punch_out_time
                                    ? (l.punch_out_date && l.punch_out_date !== l.punch_in_date ? `${l.punch_out_date} ` : '') + l.punch_out_time
                                    : null;

                                return (
                                    <tr key={l.id} style={isLate ? { background: '#fff7ed' } : {}}>
                                        <td><strong>{l.eng_name || '-'}</strong></td>
                                        <td>{l.punch_in_date || '-'} {l.punch_in_time || '-'}</td>
                                        <td>
                                            {punchOutCell
                                                ? punchOutCell
                                                : <span style={{ color: 'var(--danger)' }}>Not Out</span>}
                                        </td>
                                        <td>{l.start_meter || '-'} → {l.end_meter || '-'}</td>
                                        <td>{statusBadge}</td>
                                        <td style={{ fontSize: '12px', color: 'var(--danger)' }}>{l.late_remark || '—'}</td>
                                        <td>
                                            {isLate ? (
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    disabled={verifying === l.id}
                                                    onClick={() => handleVerify(l)}
                                                >
                                                    {verifying === l.id ? '...' : '✅ Approve'}
                                                </button>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredLogs.length === 0 && (
                    <p className="empty-message">No logs match filters</p>
                )}
            </div>
        </div>
    );
}

const fieldStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '13px',
    background: 'var(--card)',
    color: 'var(--text)',
};