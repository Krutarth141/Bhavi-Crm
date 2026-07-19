'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAttendance } from '@/hooks/useAttendance';
import AttendanceTable from '@/components/screens/attendance/AttendanceTable';
import { exportPunchLogsExcel } from '@/services/attendanceService';
import { RosterRow } from '@/types/attendance';
import { computeAttExtras, computeLeaves, fmtAttMin } from '@/utils/attendanceCalc';

const todayStr = () => new Date().toLocaleDateString('en-CA');

export default function AttendanceScreen() {
    const { data: session } = useSession();
    const adminName = (session?.user as any)?.name ?? 'Admin';
    const role = (session?.user as any)?.roleType;
    const myId = ((session?.user as any)?.email || ''); // holds user_id
    const isAdmin = role === 'admin';

    const [from, setFrom] = useState(todayStr());
    const [to, setTo] = useState(todayStr());
    const [empFilter, setEmpFilter] = useState('');
    const [applied, setApplied] = useState({ from: todayStr(), to: todayStr(), empFilter: '' });

    const { logs, shiftMap, employees, loading, error, verify } = useAttendance({
        isAdmin, myId, from: applied.from, to: applied.to, empFilter: applied.empFilter,
    });

    const search = () => setApplied({ from, to, empFilter });
    const quick = (type: 'week' | 'month') => {
        const now = new Date();
        let f: string;
        if (type === 'week') {
            const d = new Date(now);
            d.setDate(now.getDate() - now.getDay() + 1);
            f = d.toLocaleDateString('en-CA');
        } else {
            f = todayStr().substring(0, 8) + '01';
        }
        setFrom(f); setTo(todayStr());
        setApplied({ from: f, to: todayStr(), empFilter });
    };

    const handleVerify = async (id: string) => {
        const remark = prompt('Verification remark (optional):');
        if (remark === null) return;
        const result = await verify(id, remark, adminName);
        if (!result.success) alert('Error: ' + result.error);
    };

    // Roster mode — admin viewing one day with no employee filter: show every
    // punchable employee, absentees as "Not Punched In" placeholders.
    const rosterRows: RosterRow[] = useMemo(() => {
        const isRoster = isAdmin && !applied.empFilter && applied.from && applied.from === applied.to;
        if (!isRoster) return [];
        const punched: Record<string, boolean> = {};
        logs.forEach(l => { if (l.eng_id) punched[l.eng_id] = true; });
        return employees
            .filter(u => !punched[u.user_id])
            .map(u => ({ notPunched: true as const, eng_id: u.user_id, eng_name: u.name, punch_in_date: applied.from }));
    }, [isAdmin, applied, logs, employees]);

    // Summary KPIs — computed from real punch rows only, never roster placeholders.
    const summary = useMemo(() => {
        const totalDays = logs.length;
        const totalWorkMins = logs.reduce((a, l) => a + (l.working_minutes || 0), 0);
        const totalOTMins = logs.reduce((a, l) => a + (l.overtime_minutes || 0), 0);
        const lateCount = logs.filter(l => l.is_late).length;
        let officeMins = 0, shortfallMins = 0, adjustMins = 0;
        logs.forEach(l => {
            const ex = computeAttExtras(l, shiftMap);
            if (ex) { officeMins += ex.officeMin; shortfallMins += ex.shortfall; adjustMins += ex.adjustMin; }
        });
        const effectiveEmp = isAdmin ? applied.empFilter : myId;
        const leaves = (effectiveEmp && applied.from && applied.to && applied.from !== applied.to)
            ? computeLeaves(effectiveEmp, applied.from, applied.to, logs, shiftMap)
            : null;
        return { totalDays, totalWorkMins, totalOTMins, lateCount, officeMins, shortfallMins, adjustMins, leaves };
    }, [logs, shiftMap, isAdmin, applied, myId]);

    const tiles = [
        { value: String(summary.totalDays), label: 'Days Present', bg: '#eff6ff', color: '#1d4ed8' },
        ...(summary.leaves != null ? [{ value: String(summary.leaves), label: 'Leaves', bg: '#fdf2f8', color: '#be185d' }] : []),
        { value: fmtAttMin(summary.totalWorkMins), label: 'Actual Work Total', bg: '#f0fdf4', color: '#065f46' },
        { value: fmtAttMin(summary.totalOTMins), label: 'Overtime', bg: '#fff8e1', color: '#92400e' },
        { value: fmtAttMin(summary.officeMins), label: 'Office Hours Total', bg: '#eff6ff', color: '#1d4ed8' },
        { value: fmtAttMin(summary.shortfallMins), label: 'Late/Early Total', bg: '#fff0f0', color: '#dc2626' },
        { value: fmtAttMin(summary.adjustMins), label: 'Adjust Hours Total', bg: '#f0fdf4', color: '#059669' },
        { value: String(summary.lateCount), label: 'Late Punch Out', bg: '#fff0f0', color: '#dc2626' },
    ];

    const inputStyle = { border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none' };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🗓️ Attendance Report</h1>
                <button onClick={() => exportPunchLogsExcel(logs)} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                    ⬇ Download Excel
                </button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
                <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>From</label>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>To</label>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
                </div>
                {isAdmin && (
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>Employee</label>
                        <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} style={inputStyle}>
                            <option value="">All</option>
                            {employees.map(u => <option key={u.user_id} value={u.user_id}>{u.name}{u.role === 'engineer' ? ' (Eng)' : ' (WC)'}</option>)}
                        </select>
                    </div>
                )}
                <button onClick={search} style={{ padding: '8px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, height: 36 }}>🔍 Search</button>
                <button onClick={() => quick('week')} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: '#fff', height: 36 }}>This Week</button>
                <button onClick={() => quick('month')} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: '#fff', height: 36 }}>This Month</button>
            </div>

            {/* Summary KPI bar */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                {tiles.map(t => (
                    <div key={t.label} style={{ background: t.bg, borderRadius: 10, padding: '12px 16px', minWidth: 110, textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: t.color }}>{t.value}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{t.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>Loading...</p>
                ) : (
                    <AttendanceTable logs={logs} rosterRows={rosterRows} shiftMap={shiftMap} isAdmin={isAdmin} onVerify={handleVerify} />
                )}
            </div>
        </div>
    );
}