import { supabase } from '@/lib/supabase';
import { AutoSiteVisitReport } from '@/types/autoVisitsReport';

export const fetchAutoVisitsReport = async (from?: string, to?: string): Promise<AutoSiteVisitReport[]> => {
    try {
        let query = supabase
            .from('auto_site_visits')
            .select('*, auto_sites(site_name, client_name)')
            .order('visit_date', { ascending: false })
            .limit(300);
        if (from) query = query.gte('visit_date', from);
        if (to) query = query.lte('visit_date', to);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((v: any) => ({
            ...v,
            site_name: v.auto_sites?.site_name,
            client_name: v.auto_sites?.client_name,
        }));
    } catch (err) { console.error('fetchAutoVisitsReport:', err); return []; }
};