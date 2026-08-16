'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAttendance } from '@/hooks/useAttendance';
import AttendanceTable from '@/components/screens/attendance/AttendanceTable';
import { exportAttendanceExcel, approveAttEdit, rejectAttEdit } from '@/services/attendanceService';
import { PunchLog, RosterRow } from '@/types/attendance';
import { computeAttExtras, computeLeaves, computeSundayInfo, fmtAttMin, parsePendingEdit } from '@/utils/attendanceCalc';
import AttAddModal from '@/components/screens/attendance/AttAddModal';
import AttEditModal from '@/components/screens/attendance/AttEditModal';
import AttEditRequestModal from '@/components/screens/attendance/AttEditRequestModal';
import LeaveSection from '@/components/screens/attendance/LeaveSection';
import { isCspManager } from '@/lib/permissions';

const todayStr = () => new Date().toLocaleDateString('en-CA');

export default function AttendanceScreen() {
    const { data: session } = useSession();
    const adminName = (session?.user as any)?.name ?? 'Admin';
    const role = (session?.user as any)?.roleType;
    const myId = ((session?.user as any)?.email || ''); // holds user_id
    const isAdmin = role === 'admin' || isCspManager(session);

    const [from, setFrom] = useState(todayStr());
    const [to, setTo] = useState(todayStr());
    const [empFilter, setEmpFilter] = useState('');
    const [applied, setApplied] = useState({ from: todayStr(), to: todayStr(), empFilter: '' });
    const [addOpen, setAddOpen] = useState(false);
    const [editLog, setEditLog] = useState<PunchLog | null>(null);
    const [requestLog, setRequestLog] = useState<PunchLog | null>(null);

    const { logs, shiftMap, employees, sundayExclude, loading, error, verify, rejectPunch, toggleSunday, refetch } = useAttendance({
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

    // Rich context prompt matching HTML's verifyPunchLog() — used both by the
    // top-of-page Pending Punch Approvals section and the inline table button.
    const handleVerify = async (log: PunchLog) => {
        const info = (log.is_next_day ? '⚠️ NEXT DAY PUNCH OUT\n' : '⚠️ LATE PUNCH OUT\n')
            + `Engineer: ${log.eng_name}\n`
            + `Punch In: ${log.punch_in_date} ${log.punch_in_time}\n`
            + `Punch Out: ${log.punch_out_date || log.punch_in_date} ${log.punch_out_time}\n`
            + `Engineer Reason: ${log.late_remark || '—'}\n\nAdmin Remark (approval note):`;
        const remark = prompt(info);
        if (remark === null) return;
        const result = await verify(log.id, remark, adminName);
        if (!result.success) alert('Error: ' + result.error);
    };

    const handleRejectPunch = async (log: PunchLog) => {
        const reason = prompt('Reason for rejecting this punch-out? (required)');
        if (reason === null) return;
        if (!reason.trim()) { alert('A reason is required to reject.'); return; }
        const result = await rejectPunch(log.id, reason.trim(), adminName);
        if (!result.success) alert('Error: ' + result.error);
    };

    const handleApprove = async (log: PunchLog) => {
        const pe = parsePendingEdit(log.pending_edit);
        if (!pe) { alert('No pending request'); return; }
        if (!confirm(`Approve edit request from ${log.eng_name}?`)) return;
        const r = await approveAttEdit(log, pe, log.eng_id ? shiftMap[log.eng_id] : undefined);
        if (r.success) { alert('✅ Attendance edit approved!'); await refetch(); }
        else alert('Error: ' + r.error);
    };

    const handleReject = async (log: PunchLog) => {
        const reason = prompt('Reason for rejection:');
        if (reason === null) return;
        const r = await rejectAttEdit(log.id, reason);
        if (r.success) { alert('❌ Edit request rejected.'); await refetch(); }
        else alert('Error: ' + r.error);
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
        const showLeaves = !!(effectiveEmp && applied.from && applied.to && applied.from !== applied.to);
        const leaves = showLeaves ? computeLeaves(effectiveEmp, applied.from, applied.to, logs, shiftMap) : null;
        // Sunday (weekly-off) paid days — additive only, same eligibility as Leaves.
        const sunday = showLeaves ? computeSundayInfo(effectiveEmp, applied.from, applied.to, shiftMap, sundayExclude) : null;
        return {
            totalDays, totalWorkMins, totalOTMins, lateCount, officeMins, shortfallMins, adjustMins, leaves,
            effectiveEmp, sundayInfo: sunday?.info ?? null, sundayAnyExcluded: sunday?.anyExcluded ?? false,
        };
    }, [logs, shiftMap, isAdmin, applied, myId, sundayExclude]);

    // Pending Punch Approvals — admin/CSP-manager only, matches HTML's
    // renderPunchApprovalSection(). Scoped to the currently loaded date range.
    const pendingApprovals = useMemo(() => logs.filter(l => l.status === 'late_pending'), [logs]);

    const tiles = [
        { value: String(summary.totalDays), label: 'Days Present', bg: '#eff6ff', color: '#1d4ed8' },
        ...(summary.leaves != null ? [{ value: String(summary.leaves), label: 'Leaves', bg: '#fdf2f8', color: '#be185d' }] : []),
        { value: fmtAttMin(summary.totalWorkMins), label: 'Actual Work Total', bg: '#f0fdf4', color: '#065f46' },
        { value: fmtAttMin(summary.totalOTMins), label: 'Overtime', bg: '#fff8e1', color: '#92400e' },
        { value: fmtAttMin(summary.officeMins), label: 'Office Hours Total', bg: '#eff6ff', color: '#1d4ed8' },
        { value: fmtAttMin(summary.shortfallMins), label: 'Late/Early Total', bg: '#fff0f0', color: '#dc2626' },
        { value: fmtAttMin(summary.adjustMins), label: 'Adjust Hours Total', bg: '#f0fdf4', color: '#059669' },
        { value: String(summary.lateCount), label: 'Late Punch Out', bg: '#fff0f0', color: '#dc2626' },
        // ── Sunday (weekly-off) paid — separate tiles; existing totals above unchanged ──
        ...(summary.sundayInfo ? [{
            value: summary.sundayInfo.total !== summary.sundayInfo.counted ? `${summary.sundayInfo.counted} / ${summary.sundayInfo.total}` : String(summary.sundayInfo.counted),
            label: `Sundays Paid${summary.sundayAnyExcluded ? ' (excl.)' : ''}`, bg: '#f5f3ff', color: '#6d28d9',
        }] : []),
        ...(summary.sundayInfo && summary.sundayInfo.shiftMin ? [{ value: fmtAttMin(summary.officeMins + summary.sundayInfo.mins), label: 'Office Hrs + Sundays', bg: '#ecfeff', color: '#0e7490' }] : []),
        ...(summary.sundayInfo && summary.sundayInfo.shiftMin ? [{ value: fmtAttMin(summary.totalWorkMins + summary.sundayInfo.mins), label: 'Work + Sundays', bg: '#ecfeff', color: '#0e7490' }] : []),
    ];

    const handleToggleSunday = async () => {
        const result = await toggleSunday(summary.effectiveEmp, applied.from, applied.to);
        if (!result.success) alert('Error: ' + result.error);
    };

    const inputStyle = { border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none' };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🗓️ Attendance Report</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    {isAdmin && (
                        <button onClick={() => setAddOpen(true)} style={{ padding: '8px 16px', background: '#fff', color: '#185FA5', border: '1px solid #185FA5', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                            ➕ Add Attendance
                        </button>
                    )}
                    <button onClick={() => exportAttendanceExcel(logs, shiftMap)} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                        ⬇ Download Excel
                    </button>
                </div>
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
                {isAdmin && summary.sundayInfo && (
                    <div style={{ minWidth: 130, display: 'flex', alignItems: 'center' }}>
                        <button
                            onClick={handleToggleSunday}
                            style={{ padding: '8px 10px', background: summary.sundayAnyExcluded ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                        >
                            {summary.sundayAnyExcluded ? '✓ Include Sundays' : '🚫 Exclude Sundays (this month)'}
                        </button>
                    </div>
                )}
            </div>

            {isAdmin && pendingApprovals.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#92400e' }}>⏳ Pending Punch Approvals ({pendingApprovals.length})</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pendingApprovals.map(l => (
                            <div key={l.id} style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ fontSize: 12 }}>
                                    <b>{l.eng_name}</b> — {l.is_next_day ? '⚠️ Next Day Punch Out' : '⚠️ Late Punch Out'}
                                    <div style={{ color: '#6b7280', marginTop: 2 }}>
                                        In: {l.punch_in_date} {l.punch_in_time} &nbsp;•&nbsp; Out: {l.punch_out_date || l.punch_in_date} {l.punch_out_time}
                                        {l.late_remark && <> &nbsp;•&nbsp; Reason: <i>{l.late_remark}</i></>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => handleVerify(l)} style={{ padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>✅ Approve</button>
                                    <button onClick={() => setEditLog(l)} style={{ padding: '4px 10px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>✏️ Correction</button>
                                    <button onClick={() => handleRejectPunch(l)} style={{ padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>❌ Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <LeaveSection myId={myId} myName={adminName} myRole={role} canApprove={isAdmin} isAdminPure={role === 'admin'} reviewerName={adminName} />

            {/* Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>Loading...</p>
                ) : (
                    <AttendanceTable
                        logs={logs} rosterRows={rosterRows} shiftMap={shiftMap} isAdmin={isAdmin} myId={myId}
                        onVerify={handleVerify}
                        onAdminEdit={setEditLog}
                        onRequestEdit={setRequestLog}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />
                )}
            </div>

            {addOpen && (
                <AttAddModal employees={employees} shiftMap={shiftMap} onClose={() => setAddOpen(false)} onDone={async () => { setAddOpen(false); await refetch(); }} />
            )}
            {editLog && (
                <AttEditModal log={editLog} shift={editLog.eng_id ? shiftMap[editLog.eng_id] : undefined} onClose={() => setEditLog(null)} onDone={async () => { setEditLog(null); await refetch(); }} />
            )}
            {requestLog && (
                <AttEditRequestModal log={requestLog} requestedBy={adminName} onClose={() => setRequestLog(null)} onDone={async () => { setRequestLog(null); await refetch(); }} />
            )}
        </div>
    );
}