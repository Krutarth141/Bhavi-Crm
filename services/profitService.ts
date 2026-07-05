import { supabase } from '@/lib/supabase';
import { TicketRevenue } from '@/types/profit';

export const fetchRevenueTickets = async (from?: string, to?: string): Promise<TicketRevenue[]> => {
    try {
        let query = supabase
            .from('tickets')   // ← correct table name
            .select('id, assigned_name, call_type, status, service_charges, final_charges, labor, other_charge, created_at')
            .neq('call_type', 'Warranty')
            .order('created_at', { ascending: false });
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to + 'T23:59:59');
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchRevenueTickets:', err); return []; }
};