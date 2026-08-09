import { supabase } from '@/lib/supabase';
import { FieldTask, FieldTaskFormData } from '@/types/fieldTasks';

export const fetchFieldTasks = async (userId: string, isAdminList: boolean): Promise<FieldTask[]> => {
    try {
        let q = supabase.from('field_tasks').select('*').order('created_at', { ascending: false });
        if (!isAdminList) q = q.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchFieldTasks:', err); return []; }
};

export const saveFieldTask = async (
    id: number | null, form: FieldTaskFormData, assignedName: string, createdBy: string, createdByName: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const payload: any = {
            task_type: form.task_type,
            customer_name: form.customer_name.trim(),
            mobile: form.mobile.trim() || null,
            amount: form.amount.trim() === '' ? null : parseFloat(form.amount),
            address: form.address.trim() || null,
            location: form.location.trim() || null,
            assigned_to: form.assigned_to || null,
            assigned_name: form.assigned_to ? (assignedName || null) : null,
            notes: form.notes.trim() || null,
            updated_at: new Date().toISOString(),
        };
        if (id) {
            const { error } = await supabase.from('field_tasks').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            payload.status = 'Assigned';
            payload.created_by = createdBy;
            payload.created_by_name = createdByName;
            payload.task_date = new Date().toLocaleDateString('en-CA');
            payload.created_at = new Date().toISOString();
            const { error } = await supabase.from('field_tasks').insert([payload]);
            if (error) throw error;
        }
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const ftTravelStart = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const { error } = await supabase.from('field_tasks').update({ status: 'Traveling', travel_start_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const ftReached = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const { error } = await supabase.from('field_tasks').update({ status: 'Reached', reached_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const ftDone = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const { error } = await supabase.from('field_tasks').update({ status: 'Done', done_at: now.toISOString(), done_date: now.toLocaleDateString('en-CA'), updated_at: now.toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const ftCancel = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('field_tasks').update({ status: 'Cancelled', updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const ftDelete = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('field_tasks').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export interface FtReportRow { name: string; total: number; amount: number; types: Record<string, number>; }

export const fetchFtReport = async (from: string, to: string): Promise<FtReportRow[]> => {
    const { data, error } = await supabase.from('field_tasks').select('*').eq('status', 'Done').gte('done_date', from).lte('done_date', to);
    if (error) throw error;
    const byEng: Record<string, FtReportRow> = {};
    (data || []).forEach((t: any) => {
        const key = t.assigned_to || '—';
        if (!byEng[key]) byEng[key] = { name: t.assigned_name || key, total: 0, amount: 0, types: {} };
        byEng[key].total++;
        byEng[key].types[t.task_type || 'Other'] = (byEng[key].types[t.task_type || 'Other'] || 0) + 1;
        const a = parseFloat(t.amount);
        if (!isNaN(a)) byEng[key].amount += a;
    });
    return Object.values(byEng).sort((a, b) => b.total - a.total);
};