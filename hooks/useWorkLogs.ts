import { useState, useEffect, useCallback } from 'react';
import { fetchWorkLogs, fetchWorkLogMembers } from '@/services/workLogService';
import {
    WorkLog,
    WorkLogMember,
    WorkLogFilters,
    WorkLogStats,
    WorkLogsByEngineer,
} from '@/types/workLogs';

function getTodayLocal(): string {
    return new Date().toLocaleDateString('en-CA');
}

function groupByEngineer(logs: WorkLog[]): WorkLogsByEngineer {
    const byEng: WorkLogsByEngineer = {};
    logs.forEach((l) => {
        const key = l.eng_name || l.eng_id;
        if (!byEng[key]) byEng[key] = {};
        if (!byEng[key][l.log_date]) byEng[key][l.log_date] = [];
        byEng[key][l.log_date].push(l);
    });
    return byEng;
}

function computeStats(logs: WorkLog[]): WorkLogStats {
    const engineers = new Set(logs.map((l) => l.eng_name || l.eng_id));
    const days = new Set(logs.map((l) => l.log_date));
    return {
        totalEntries: logs.length,
        totalEngineers: engineers.size,
        totalDays: days.size,
    };
}
export function useWorkLogMembers() {
    const [members, setMembers] = useState<WorkLogMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchWorkLogMembers()
            .then(setMembers)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    return { members, loading, error };
}

export function useWorkLogs() {
    const today = getTodayLocal();

    const [filters, setFilters] = useState<WorkLogFilters>({
        from: today,
        to: today,
        engId: '',
    });

    const [logs, setLogs] = useState<WorkLog[]>([]);
    const [grouped, setGrouped] = useState<WorkLogsByEngineer>({});
    const [stats, setStats] = useState<WorkLogStats>({ totalEntries: 0, totalEngineers: 0, totalDays: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async (f: WorkLogFilters) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchWorkLogs(f);
            setLogs(data);
            setGrouped(groupByEngineer(data));
            setStats(computeStats(data));
        } catch (e: any) {
            setError(e.message);
            setLogs([]);
            setGrouped({});
            setStats({ totalEntries: 0, totalEngineers: 0, totalDays: 0 });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        search(filters);
    }, []);

    const handleSearch = () => search(filters);

    return {
        filters,
        setFilters,
        logs,
        grouped,
        stats,
        loading,
        error,
        handleSearch,
    };
}