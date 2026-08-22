import { supabase } from '@/lib/supabase';
import { TicketRevenue } from '@/types/profit';

// Mirrors HTML's loadProfit(): all call types (Warranty included) — the
// legacy dashboard never excludes Warranty from the Profit view, only the
// separate Non-Warranty Sales report does that.
export const fetchRevenueTickets = async (from?: string, to?: string): Promise<TicketRevenue[]> => {
    try {
        let all: TicketRevenue[] = [];
        let offset = 0;
        const PAGE = 1000;
        while (true) {
            let query = supabase
                .from('tickets')   // ← correct table name
                .select('id, assigned_name, call_type, status, service_charges, final_charges, labor, other_charge, created_at')
                .order('created_at', { ascending: false });
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to + 'T23:59:59');
            const { data: page, error } = await query.range(offset, offset + PAGE - 1);
            if (error) throw error;
            all = all.concat(page || []);
            if (!page || page.length < PAGE) break;
            offset += PAGE;
        }
        return all;
    } catch (err) { console.error('fetchRevenueTickets:', err); return []; }
};

// "Cash Collected" — mirrors HTML's loadProfit() daily_reports.total_amount
// sum for the same date range (the actual cash engineers handed in, distinct
// from billed/estimated ticket revenue).
export const fetchCollectedAmount = async (from?: string, to?: string): Promise<number> => {
    try {
        let query = supabase.from('daily_reports').select('total_amount');
        if (from) query = query.gte('report_date', from);
        if (to) query = query.lte('report_date', to);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).reduce((s, r: any) => s + (parseFloat(r.total_amount) || 0), 0);
    } catch (err) { console.error('fetchCollectedAmount:', err); return 0; }
};