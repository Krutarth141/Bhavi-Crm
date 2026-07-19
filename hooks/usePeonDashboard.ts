import { useState, useEffect, useCallback } from 'react';
import { PeonTask, PeonTaskLog } from '@/types/peon';
import { fetchTodayPeonData, buildTaskList, toggleTaskDone, saveExtraWork, deleteExtraWork, fetchPeonPunchStatus, peonPunchIn, peonPunchOut } from '@/services/peonService';

const today = () => new Date().toLocaleDateString('en-CA');

export const usePeonDashboard = (peonId: string, peonName: string) => {
    const [tasks, setTasks] = useState<PeonTask[]>([]);
    const [doneTaskIds, setDoneTaskIds] = useState<string[]>([]);
    const [extraLogs, setExtraLogs] = useState<PeonTaskLog[]>([]);
    const [scheduledTimes, setScheduledTimes] = useState<Record<string, string>>({});
    const [punch, setPunch] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!peonId) { setLoading(false); return; }
        setLoading(true);
        const date = today();
        const [{ logs, config }, punchRow] = await Promise.all([
            fetchTodayPeonData(peonId, date),
            fetchPeonPunchStatus(peonId, date),
        ]);
        setTasks(buildTaskList(config));
        const times: Record<string, string> = {};
        config.forEach(c => { if (c.scheduled_time) times[c.task_id] = c.scheduled_time; });
        setScheduledTimes(times);
        setDoneTaskIds(logs.filter(l => !l.task_name.startsWith('extra_')).map(l => l.task_name));
        setExtraLogs(logs.filter(l => l.task_name.startsWith('extra_')));
        setPunch(punchRow);
        setLoading(false);
    }, [peonId]);

    useEffect(() => { load(); }, [load]);

    const toggleTask = async (taskId: string, taskLabel: string, doneTime?: string) => {
        const r = await toggleTaskDone(peonId, peonName, today(), taskId, taskLabel, doneTime);
        if (r.success) await load();
        return r;
    };

    const addExtra = async (note: string, from: string, to: string) => {
        const r = await saveExtraWork(peonId, peonName, today(), note, from, to);
        if (r.success) await load();
        return r;
    };

    const removeExtra = async (id: string) => {
        await deleteExtraWork(id);
        await load();
    };

    const punchIn = async () => { await peonPunchIn(peonId, peonName, today()); await load(); };
    const punchOut = async () => { if (punch) { await peonPunchOut(punch.id); await load(); } };

    return { tasks, doneTaskIds, extraLogs, scheduledTimes, punch, loading, toggleTask, addExtra, removeExtra, punchIn, punchOut, refetch: load };
};