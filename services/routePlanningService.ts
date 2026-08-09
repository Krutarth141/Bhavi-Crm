import { supabase } from '@/lib/supabase';
import { Ticket } from '@/types/tickets';

const ROUTE_EXCLUDE_STATUSES = ['Closed', 'Call Cancel', 'Customer Reject'];

export const fetchEngineerActiveTickets = async (engineerId: string): Promise<Ticket[]> => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('assigned_to', engineerId)
            .not('status', 'in', `(${ROUTE_EXCLUDE_STATUSES.map((s) => `"${s}"`).join(',')})`)
            .order('sequence_no', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('fetchEngineerActiveTickets:', err);
        return [];
    }
};

export const saveRoutePlan = async (tickets: Ticket[], date: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await Promise.all(tickets.map((t, i) =>
            supabase.from('tickets').update({ sequence_no: i + 1, planned_date: date, updated_at: new Date().toISOString() }).eq('id', t.id)
        ));
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};