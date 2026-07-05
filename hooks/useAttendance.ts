import { useState, useEffect } from 'react';
import { PunchLog } from '@/types/attendance';
import { fetchPunchLogs, verifyPunchLog } from '@/services/attendanceService';

export const useAttendance = () => {
    const [logs, setLogs] = useState<PunchLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchPunchLogs();
            setLogs(data);
        } catch (err) {
            setError((err as any).message || 'Failed to load punch logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadLogs(); }, []);

    const verify = async (id: string, remark: string, verifiedBy: string) => {
        const result = await verifyPunchLog(id, remark, verifiedBy);
        if (result.success) await loadLogs();
        return result;
    };

    // Derived
    const engineers = [...new Set(logs.map(l => l.eng_name).filter(Boolean))].sort();

    return {
        logs,
        loading,
        error,
        engineers,
        refetch: loadLogs,
        verify,
    };
};