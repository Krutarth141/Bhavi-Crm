import { supabase } from '@/lib/supabase';
import { DailyReport, WCDailyReport } from '@/types/weeklyReport';

export const fetchDailyReports = async (from: string, to: string): Promise<DailyReport[]> => {
    try {
        const { data, error } = await supabase
            .from('daily_reports')
            .select('*')
            .gte('report_date', from)
            .lte('report_date', to)
            .order('report_date', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchDailyReports:', err); return []; }
};

export const fetchWCDailyReports = async (from: string, to: string): Promise<WCDailyReport[]> => {
    try {
        const { data, error } = await supabase
            .from('wc_daily_reports')
            .select('*')
            .gte('report_date', from)
            .lte('report_date', to)
            .order('report_date', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchWCDailyReports:', err); return []; }
};

export const fetchTicketSummary = async (from: string, to: string) => {
    try {
        // Table name is 'tickets' not 'service_tickets'
        const { data, error } = await supabase
            .from('tickets')
            .select('status, call_type, assigned_name, service_charges, final_charges, labor, created_at')
            .gte('created_at', from)
            .lte('created_at', to + 'T23:59:59');
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchTicketSummary:', err); return []; }
};