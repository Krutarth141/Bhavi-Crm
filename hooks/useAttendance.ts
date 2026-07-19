import { useState, useEffect, useCallback } from 'react';
import { PunchLog } from '@/types/attendance';
import { EmployeeShift } from '@/types/settings';
import { fetchPunchLogs, fetchAttendanceEmployees, verifyPunchLog } from '@/services/attendanceService';
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

    useEffect(() => {
        if (isAdmin) fetchAttendanceEmployees().then(setEmployees);
    }, [isAdmin]);

    const verify = async (id: string, remark: string, verifiedBy: string) => {
        const result = await verifyPunchLog(id, remark, verifiedBy);
        if (result.success) await load();
        return result;
    };

    return { logs, shiftMap, employees, loading, error, refetch: load, verify };
};