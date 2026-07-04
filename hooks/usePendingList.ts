import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface PendingTicket {
    id: string;
    cname: string;
    mobile: string;
    brand_name: string;
    model: string;
    serial: string;
    area?: string;
    pin?: string;
    status: string;
    created_at: string;
    updated_at: string;
    assigned_to?: string;
    assigned_name?: string;
    call_type: string;
    service_type: string;
    wc_type?: string;
    tat_date?: string;
    sequence_no?: number;
}

interface Engineer {
    id: string;
    name: string;
}

const CLOSED_STATUSES = [
    'Closed',
    'Rejected',
    'Cancelled',
    'Delivered',
    'Repaired',
    'Call Cancel',
    'Customer Reject',
];

export function usePendingList() {
    const [tickets, setTickets] = useState<PendingTicket[]>([]);
    const [engineers, setEngineers] = useState<Engineer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = useCallback(async () => {
        try {
            const { data, error: ticketsError } = await supabase
                .from('tickets')
                .select(
                    'id,cname,mobile,wc_type,brand_name,model,serial,pin,area,status,created_at,updated_at,assigned_to,assigned_name,call_type,service_type,sequence_no,tat_date'
                )
                .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`)
                .order('created_at', { ascending: false })
                .limit(2000);

            if (ticketsError) throw ticketsError;
            setTickets(data ?? []);
        } catch (err: any) {
            console.error('usePendingList fetchTickets error:', err);
            setError(err?.message ?? String(err));
        }
    }, []);

    const fetchEngineers = useCallback(async () => {
        try {
            const { data, error: engError } = await supabase
                .from('users')
                .select('id,name')
                .eq('role', 'engineer')
                .eq('is_active', true)
                .order('name');

            if (engError) throw engError;
            setEngineers(data ?? []);
        } catch (err: any) {
            console.error('usePendingList fetchEngineers error:', err);
            setError(err?.message ?? String(err));
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                setError(null);
                await Promise.all([fetchTickets(), fetchEngineers()]);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [fetchTickets, fetchEngineers]);

    return {
        tickets,
        engineers,
        loading,
        error,
        refetch: fetchTickets,
    };
}
