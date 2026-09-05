import { useState, useEffect, useCallback } from 'react';
import { PunchLog } from '@/types/attendance';
import { EmployeeShift } from '@/types/settings';
import {
    fetchPunchLogs, fetchAttendanceFilterEmployees, fetchAttendanceAddEmployees, verifyPunchLog, rejectPunchLog,
    fetchSundayExclude, toggleSundayExclude as toggleSundayExcludeService,
    fetchAttendanceRosterEmployees, fetchPendingPunchApprovals,
} from '@/services/attendanceService';
import { fetchShiftMap } from '@/services/settingsService';

interface Params {
    isAdmin: boolean;
    myId: string;      // current user's user_id — used when not admin
    from: string;
    to: string;
    empFilter: string; // admin-selected employee ('' = all); ignored for non-admins
}

export const useAttendance = ({ isAdmin, myId, from, to, empFilter }: Params) => {
    const [logs, setLogs] = useState<PunchLog[]>([]);
    const [shiftMap, setShiftMap] = useState<Record<string, EmployeeShift>>({});
    const [employees, setEmployees] = useState<{ user_id: string; name: string; role: string }[]>([]);
    const [addEmployees, setAddEmployees] = useState<{ user_id: string; name: string; role: string }[]>([]);
    const [rosterEmployees, setRosterEmployees] = useState<{ user_id: string; name: string; role: string }[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState<PunchLog[]>([]);
    const [sundayExclude, setSundayExclude] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const empId = isAdmin ? (empFilter || undefined) : myId;
            const [logsData, shifts] = await Promise.all([
                fetchPunchLogs({ from, to, empId }),
                fetchShiftMap(),
            ]);
            setLogs(logsData);
            setShiftMap(shifts);
        } catch (err) {
            setError((err as any).message || 'Failed to load punch logs');
        } finally {
            setLoading(false);
        }
    }, [isAdmin, myId, from, to, empFilter]);

    useEffect(() => { load(); }, [load]);

    // Pending Punch Approvals — matches HTML's renderPunchApprovalSection():
    // an unconditional fetch of ALL late_pending rows, independent of the
    // report's currently-applied date range. Reloaded on the same triggers
    // as the date-scoped logs so approve/reject actions refresh it too.
    const loadPendingApprovals = useCallback(async () => {
        if (!isAdmin) { setPendingApprovals([]); return; }
        setPendingApprovals(await fetchPendingPunchApprovals());
    }, [isAdmin]);

    useEffect(() => { loadPendingApprovals(); }, [loadPendingApprovals]);

    useEffect(() => {
        if (isAdmin) {
            fetchAttendanceFilterEmployees().then(setEmployees);
            fetchAttendanceAddEmployees().then(setAddEmployees);
            fetchAttendanceRosterEmployees().then(setRosterEmployees);
        }
    }, [isAdmin]);

    useEffect(() => { fetchSundayExclude().then(setSundayExclude); }, []);

    const verify = async (id: string, remark: string, verifiedBy: string) => {
        const result = await verifyPunchLog(id, remark, verifiedBy);
        if (result.success) { await load(); await loadPendingApprovals(); }
        return result;
    };

    const rejectPunch = async (id: string, reason: string, verifiedBy: string) => {
        const result = await rejectPunchLog(id, reason, verifiedBy);
        if (result.success) { await load(); await loadPendingApprovals(); }
        return result;
    };

    const toggleSunday = async (empId: string, fromDate: string, toDate: string) => {
        const result = await toggleSundayExcludeService(empId, fromDate, toDate, sundayExclude);
        if (result.success && result.next) setSundayExclude(result.next);
        return result;
    };

    const refetch = async () => { await load(); await loadPendingApprovals(); };

    return {
        logs, shiftMap, employees, addEmployees, rosterEmployees, pendingApprovals,
        sundayExclude, loading, error, refetch, verify, rejectPunch, toggleSunday,
    };
};