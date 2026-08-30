import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkLog, PunchLog } from '@/types/myCalls';

export function useMyCalls(engId: string, engName: string) {
    const [punchLog, setPunchLog] = useState<PunchLog | null>(null);
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [myTickets, setMyTickets] = useState<any[]>([]);
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
            ] = await Promise.all([
                supabase
                    .from('punch_logs')
                    .select('*')
                    .eq('eng_id', engId)
                    .eq('status', 'active')   // catches an unclosed punch from a prior day too
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
                    .order('sequence_no', { ascending: true, nullsFirst: false }),
            ]);

            if (punchError) throw punchError;
            if (workError) throw workError;
            if (ticketsError) throw ticketsError;

            setPunchLog(punchData ?? null);
            setWorkLogs(workData ?? []);
            setMyTickets(ticketsData ?? []);
        } catch (err: any) {
            console.error('useMyCalls fetch error:', err);
            setError(err?.message ?? String(err));
        } finally {
            setLoading(false);
        }
    }, [engId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    return { punchLog, workLogs, myTickets, loading, error, refetch: fetchAll };
}