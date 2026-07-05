import { supabase } from '@/lib/supabase';
import { AutoSite, AutoSiteItem, AutoSiteVisit, SiteFormData } from '@/types/autoSites';

export const fetchSites = async (): Promise<AutoSite[]> => {
    try {
        const { data, error } = await supabase.from('auto_sites').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSites:', err); return []; }
};

export const createSite = async (form: SiteFormData, createdBy: string): Promise<{ success: boolean; id?: number; error?: string }> => {
    try {
        const { data, error } = await supabase.from('auto_sites').insert([{
            site_name: form.site_name.trim(),
            client_name: form.client_name.trim(),
            mobile: form.mobile.trim() || null,
            address: form.address.trim() || null,
            created_by: createdBy,
        }]).select().single();
        if (error) throw error;
        return { success: true, id: data.id };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const deleteSite = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_sites').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const fetchSiteItems = async (siteId: number): Promise<AutoSiteItem[]> => {
    try {
        const { data, error } = await supabase.from('auto_site_items').select('*').eq('site_id', siteId).order('created_at');
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSiteItems:', err); return []; }
};

export const fetchSiteVisits = async (siteId: number): Promise<AutoSiteVisit[]> => {
    try {
        const { data, error } = await supabase.from('auto_site_visits').select('*').eq('site_id', siteId).order('visit_date', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSiteVisits:', err); return []; }
};

export const addSiteVisit = async (siteId: number, visitData: Partial<AutoSiteVisit>): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_site_visits').insert([{ site_id: siteId, ...visitData }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};