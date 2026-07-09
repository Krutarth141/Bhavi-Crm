import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkLog, PunchLog } from '@/types/myCalls';

const MY_CALLS_CLOSED_STATUSES = ['Closed', 'Call Cancel', 'Customer Reject', 'Cancelled'];

export function useMyCalls(engId: string, engName: string) {
    const [punchLog, setPunchLog] = useState<PunchLog | null>(null);
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [myTickets, setMyTickets] = useState<any[]>([]);
    const [myTasks, setMyTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        if (!engId) { setLoading(false); return; }

        try {
            setLoading(true);
            setError(null);

            const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

            const [
                { data: punchData, error: punchError },
                { data: workData, error: workError },
                { data: ticketsData, error: ticketsError },
                { data: tasksData, error: tasksError },
            ] = await Promise.all([
                supabase
                    .from('punch_logs')
                    .select('*')
                    .eq('eng_id', engId)
                    .eq('punch_in_date', today)   // ← was log_date
                    .maybeSingle(),
                supabase
                    .from('work_logs')
                    .select('*')
                    .eq('eng_id', engId)
                    .eq('log_date', today)         // keep as-is — check work_logs schema
                    .order('from_time'),
                supabase
                    .from('tickets')
                    .select('*')
                    .eq('assigned_to', engId)
                    .not(
                        'status',
                        'in',
                        `(${MY_CALLS_CLOSED_STATUSES.map(s => `"${s}"`).join(',')})`
                    )
                    .order('sequence_no', { ascending: true, nullsFirst: false }),
                supabase
                    .from('tasks')
                    .select('*')
                    .eq('assigned_to', engId)
                    .neq('status', 'Closed')
                    .order('created_at', { ascending: false }),
            ]);

            if (punchError) throw punchError;
            if (workError) throw workError;
            if (ticketsError) throw ticketsError;
            if (tasksError) throw tasksError;

            setPunchLog(punchData ?? null);
            setWorkLogs(workData ?? []);
            setMyTickets(ticketsData ?? []);
            setMyTasks(tasksData ?? []);
        } catch (err: any) {
            console.error('useMyCalls fetch error:', err);
            setError(err?.message ?? String(err));
        } finally {
            setLoading(false);
        }
    }, [engId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    return { punchLog, workLogs, myTickets, myTasks, loading, error, refetch: fetchAll };
}