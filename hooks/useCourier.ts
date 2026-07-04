import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CourierEntry, CourierReceiver } from '@/types/courier';

export function useCourier() {
    const [entries, setEntries] = useState<CourierEntry[]>([]);
    const [receivers, setReceivers] = useState<CourierReceiver[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEntries = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const cutoffDate = thirtyDaysAgo.toLocaleDateString('en-CA'); // YYYY-MM-DD

            const { data, error: fetchError } = await supabase
                .from('courier_log')
                .select('*')
                .gte('entry_date', cutoffDate)
                .order('entry_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setEntries(data || []);
        } catch (err: any) {
            console.error('Failed to fetch courier entries:', err);
            setError(err.message ?? String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchReceivers = useCallback(async () => {
        try {
            // Table name is receiver_master (not courier_receivers)
            const { data, error: fetchError } = await supabase
                .from('receiver_master')
                .select('*')
                .order('name', { ascending: true });

            if (fetchError) throw fetchError;
            setReceivers(data || []);
        } catch (err: any) {
            console.error('Failed to fetch receivers:', err);
        }
    }, []);

    const refetch = useCallback(async () => {
        await Promise.all([fetchEntries(), fetchReceivers()]);
    }, [fetchEntries, fetchReceivers]);

    useEffect(() => {
        fetchEntries();
        fetchReceivers();
    }, [fetchEntries, fetchReceivers]);

    return {
        entries,
        receivers,
        loading,
        error,
        refetch,
        refetchReceivers: fetchReceivers,
    };
}