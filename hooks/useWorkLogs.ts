import { useState, useEffect, useCallback } from 'react';
import { fetchWorkLogs, fetchWorkLogMembers, fetchPeonTaskLogs } from '@/services/workLogService';
import {
    WorkLog,
    WorkLogMember,
    WorkLogFilters,
    WorkLogStats,
    WorkLogsByEngineer,
    PeonLogsByPeon,
    PeonTaskLog,
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

function groupByPeon(logs: PeonTaskLog[]): PeonLogsByPeon {
    const byPeon: PeonLogsByPeon = {};
    logs.forEach((l) => {
        const key = l.peon_name || l.peon_id;
        if (!byPeon[key]) byPeon[key] = {};
        if (!byPeon[key][l.log_date]) byPeon[key][l.log_date] = [];
        byPeon[key][l.log_date].push(l);
    });
    return byPeon;
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
    const [peonGrouped, setPeonGrouped] = useState<PeonLogsByPeon>({});
    const [isPeonMode, setIsPeonMode] = useState(false);
    const [stats, setStats] = useState<WorkLogStats>({ totalEntries: 0, totalEngineers: 0, totalDays: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async (f: WorkLogFilters, peon: boolean) => {
        setLoading(true);
        setError(null);
        setIsPeonMode(peon);
        try {
            if (peon) {
                const data = await fetchPeonTaskLogs(f);
                setPeonGrouped(groupByPeon(data));
                setLogs([]);
                setGrouped({});
                setStats({
                    totalEntries: data.length,
                    totalEngineers: new Set(data.map((l) => l.peon_name || l.peon_id)).size,
                    totalDays: new Set(data.map((l) => l.log_date)).size,
                });
            } else {
                const data = await fetchWorkLogs(f);
                setLogs(data);
                setGrouped(groupByEngineer(data));
                setPeonGrouped({});
                setStats(computeStats(data));
            }
        } catch (e: any) {
            setError(e.message);
            setLogs([]);
            setGrouped({});
            setPeonGrouped({});
            setStats({ totalEntries: 0, totalEngineers: 0, totalDays: 0 });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        search(filters, false);
    }, []);

    const handleSearch = (isPeon: boolean) => search(filters, isPeon);

    return {
        filters,
        setFilters,
        logs,
        grouped,
        peonGrouped,
        isPeonMode,
        stats,
        loading,
        error,
        handleSearch,
    };
}