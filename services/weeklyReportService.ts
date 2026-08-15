import { supabase } from '@/lib/supabase';
import { DailyReport, WCDailyReport } from '@/types/reports';

export const fetchDailyReportsRange = async (from: string, to: string): Promise<DailyReport[]> => {
    try {
        let all: WeeklyTicket[] = [];
        let offset = 0;
        const PAGE = 1000;
        while (true) {
            const { data: page, error } = await supabase.from('tickets')
                .select('id, status, assigned_name, call_type, service_charges, final_charges, labor, created_at, updated_at')
                .gte('updated_at', from).lte('updated_at', to + 'T23:59:59')
                .range(offset, offset + PAGE - 1);
            if (error) throw error;
            all = all.concat(page || []);
            if (!page || page.length < PAGE) break;
            offset += PAGE;
        }
        return all;
    } catch (err) { console.error('fetchDailyReportsRange:', err); return []; }
};

export const fetchWCDailyReportsRange = async (from: string, to: string): Promise<WCDailyReport[]> => {
    try {
        const { data, error } = await supabase.from('wc_daily_reports').select('*')
            .gte('report_date', from).lte('report_date', to).order('report_date', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchWCDailyReportsRange:', err); return []; }
};

export interface WeeklyTicket {
    id: string;
    status: string;
    assigned_name?: string;
    call_type?: string;
    service_charges?: number;
    final_charges?: number;
    labor?: number;
    created_at?: string;
    updated_at?: string;
}

export const fetchTicketsRange = async (from: string, to: string): Promise<WeeklyTicket[]> => {
    try {
        const { data, error } = await supabase.from('tickets')
            .select('id, status, assigned_name, call_type, service_charges, final_charges, labor, created_at, updated_at')
            .gte('updated_at', from).lte('updated_at', to + 'T23:59:59').limit(1000);
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchTicketsRange:', err); return []; }
};

export const fetchPunchCountRange = async (from: string, to: string): Promise<number> => {
    try {
        const { count, error } = await supabase.from('punch_logs').select('id', { count: 'exact', head: true })
            .gte('punch_in_date', from).lte('punch_in_date', to);
        if (error) throw error;
        return count || 0;
    } catch (err) { console.error('fetchPunchCountRange:', err); return 0; }
};