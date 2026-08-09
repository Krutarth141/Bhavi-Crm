import { supabase } from '@/lib/supabase';
import { SiteVisit, SiteVisitFormData } from '@/types/siteVisits';

export const fetchSiteVisits = async (userId: string, isAdminList: boolean): Promise<SiteVisit[]> => {
    try {
        let q = supabase.from('site_visits').select('*').order('created_at', { ascending: false });
        if (!isAdminList) q = q.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSiteVisits:', err); return []; }
};

export const saveSiteVisit = async (
    id: number | null, form: SiteVisitFormData, assignedName: string, createdBy: string, createdByName: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const payload: any = {
            visit_type: form.visit_type,
            client_name: form.client_name.trim(),
            site_name: form.site_name.trim() || null,
            address: form.address.trim() || null,
            location: form.location.trim() || null,
            rooms: form.rooms.trim() === '' ? null : parseInt(form.rooms, 10),
            visit_date: form.visit_date || null,
            purpose: form.purpose.trim() || null,
            assigned_to: form.assigned_to || null,
            assigned_name: form.assigned_to ? (assignedName || null) : null,
            notes: form.notes.trim() || null,
            updated_at: new Date().toISOString(),
        };
        if (id) {
            const { error } = await supabase.from('site_visits').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            payload.status = 'Assigned';
            payload.created_by = createdBy;
            payload.created_by_name = createdByName;
            payload.created_at = new Date().toISOString();
            const { error } = await supabase.from('site_visits').insert([payload]);
            if (error) throw error;
        }
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const svTravelStart = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const { error } = await supabase.from('site_visits').update({ status: 'Traveling', travel_start_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const svReached = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const { error } = await supabase.from('site_visits').update({ status: 'Reached', reached_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const svWorkStart = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const { error } = await supabase.from('site_visits').update({ status: 'Working', work_start_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const svWorkEnd = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const { error } = await supabase.from('site_visits').update({ work_end_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const svStopTravel = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('site_visits').update({ status: 'Assigned', travel_start_at: null, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const svStopWork = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('site_visits').update({ status: 'Reached', work_start_at: null, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const svDone = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const { error } = await supabase.from('site_visits').update({ status: 'Done', done_at: now.toISOString(), done_date: now.toLocaleDateString('en-CA'), updated_at: now.toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const svCancel = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('site_visits').update({ status: 'Cancelled', updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const svDelete = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('site_visits').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export interface SvReportRow { name: string; total: number; types: Record<string, number>; }

export const fetchSvReport = async (from: string, to: string): Promise<SvReportRow[]> => {
    const { data, error } = await supabase.from('site_visits').select('*').eq('status', 'Done').gte('done_date', from).lte('done_date', to);
    if (error) throw error;
    const byEng: Record<string, SvReportRow> = {};
    (data || []).forEach((t: any) => {
        const key = t.assigned_to || '—';
        if (!byEng[key]) byEng[key] = { name: t.assigned_name || key, total: 0, types: {} };
        byEng[key].total++;
        byEng[key].types[t.visit_type || 'Other'] = (byEng[key].types[t.visit_type || 'Other'] || 0) + 1;
    });
    return Object.values(byEng).sort((a, b) => b.total - a.total);
};