import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { WalkInEntry } from '@/types/walkin';

export function useWalkIn(roleType: string, userId: string) {
    const [todayLogs, setTodayLogs] = useState<WalkInEntry[]>([]);
    const [allLogs, setAllLogs] = useState<WalkInEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTodayLogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

            let query = supabase
                .from('walkin_log')
                .select('*')
                .eq('visit_date', today)
                .order('token_no', { ascending: true });

            if (roleType !== 'admin') {
                query = query.eq('wc_id', userId);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;
            setTodayLogs(data || []);
        } catch (err: any) {
            console.error('Failed to fetch today walk-in logs:', err);
            setError(err.message ?? String(err));
        } finally {
            setLoading(false);
        }
    }, [roleType, userId]);

    const fetchByDateRange = useCallback(
        async (from: string, to: string, search: string): Promise<WalkInEntry[]> => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('walkin_log')
                    .select('*')
                    .gte('visit_date', from)
                    .lte('visit_date', to)
                    .order('visit_date', { ascending: false })
                    .order('token_no', { ascending: true });

                if (fetchError) throw fetchError;

                const results = data || [];

                if (!search.trim()) {
                    setAllLogs(results);
                    return results;
                }

                const term = search.toLowerCase();
                const filtered = results.filter(
                    (entry) =>
                        entry.customer_name?.toLowerCase().includes(term) ||
                        entry.mobile?.toLowerCase().includes(term)
                );

                setAllLogs(filtered);
                return filtered;
            } catch (err: any) {
                console.error('Failed to fetch walk-in logs by date range:', err);
                return [];
            }
        },
        []
    );

    useEffect(() => {
        fetchTodayLogs();
    }, [fetchTodayLogs]);

    return {
        todayLogs,
        allLogs,
        loading,
        error,
        refetch: fetchTodayLogs,
        fetchByDateRange,
    };
}
