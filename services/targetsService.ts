import { supabase } from '@/lib/supabase';
import { EngineerTarget, TargetFormData } from '@/types/targets';

export const fetchTargets = async (month?: string): Promise<EngineerTarget[]> => {
    try {
        let query = supabase.from('engineer_targets').select('*').order('eng_name');
        if (month) query = query.eq('month', month);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchTargets:', err); return []; }
};

export const upsertTarget = async (form: TargetFormData): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('engineer_targets').upsert([{
            eng_id: form.eng_id,
            eng_name: form.eng_name,
            month: form.month,
            target_calls: form.target_calls ? Number(form.target_calls) : null,
            target_amount: form.target_amount ? Number(form.target_amount) : null,
            updated_at: new Date().toISOString(),
        }], { onConflict: 'eng_id,month' });
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const deleteTarget = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('engineer_targets').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

// Fetch actual call counts + revenue from service_tickets for comparison
export const fetchActualPerformance = async (month: string): Promise<Record<string, { calls: number; revenue: number }>> => {
    try {
        const from = month + '-01';
        const to = month + '-31';
        const { data } = await supabase
            .from('service_tickets')
            .select('assigned_name, status, service_charges, final_charges, call_type')
            .gte('created_at', from)
            .lte('created_at', to);
        const result: Record<string, { calls: number; revenue: number }> = {};
        (data || []).forEach((t: any) => {
            const name = t.assigned_name || 'Unassigned';
            if (!result[name]) result[name] = { calls: 0, revenue: 0 };
            result[name].calls++;
            if (t.call_type !== 'Warranty') {
                const rev = parseFloat(t.final_charges || t.service_charges || 0);
                result[name].revenue += rev;
            }
        });
        return result;
    } catch { return {}; }
};