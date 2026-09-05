import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { WalkInEntry, SELF_CHECKIN_WC_IDS } from '@/types/walkin';

// Mirrors HTML's inline WC-type sniff used to pick which self-checkin bucket
// a WC should also see (index.html:16449-16454, 16660-16665) — a real ICP/CSP
// user has no separate "wc_type" field, so the WC's own name/user_id is
// pattern-matched instead.
function selfCheckinIdsFor(userName: string, userId: string): [string, string] {
    const n = (userName || '').toUpperCase();
    const u = (userId || '').toUpperCase();
    const isCSP = n.includes('CSP') || u.includes('CSP');
    return [isCSP ? SELF_CHECKIN_WC_IDS.CSP : SELF_CHECKIN_WC_IDS.ICP, SELF_CHECKIN_WC_IDS.OTHER];
}

export function useWalkIn(roleType: string, userId: string, userName: string = '') {
    const [todayLogs, setTodayLogs] = useState<WalkInEntry[]>([]);
    const [allLogs, setAllLogs] = useState<WalkInEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mirrors HTML's today-list query (index.html:16446-16459) — ORs in the
    // WC's own wc_id alongside the relevant SELF_CHECKIN_* rows (QR kiosk
    // check-ins), newest first by created_at/arrival_time.
    const fetchLogsForDate = useCallback(
        async (date: string): Promise<WalkInEntry[]> => {
            try {
                let query = supabase.from('walkin_log').select('*').eq('visit_date', date);

                if (roleType !== 'admin') {
                    const [selfId, otherId] = selfCheckinIdsFor(userName, userId);
                    query = query.or(`wc_id.eq.${userId},wc_id.eq.${selfId},wc_id.eq.${otherId}`);
                }

                query = query
                    .order('created_at', { ascending: false, nullsFirst: false })
                    .order('arrival_time', { ascending: false });

                const { data, error: fetchError } = await query;
                if (fetchError) throw fetchError;
                return data || [];
            } catch (err) {
                console.error('Failed to fetch walk-in logs for date:', err);
                return [];
            }
        },
        [roleType, userId, userName]
    );

    const fetchTodayLogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
            const data = await fetchLogsForDate(today);
            setTodayLogs(data);
        } catch (err: any) {
            console.error('Failed to fetch today walk-in logs:', err);
            setError(err.message ?? String(err));
        } finally {
            setLoading(false);
        }
    }, [fetchLogsForDate]);

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
        fetchLogsForDate,
    };
}