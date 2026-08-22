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

const nextMonth = (ym: string): string => {
    const [y, m] = ym.split('-').map(Number);
    return m >= 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

export const fetchActualPerformance = async (month: string): Promise<Record<string, { calls: number; revenue: number }>> => {
    try {
        const from = `${month}-01T00:00:00`;
        const to = `${nextMonth(month)}-01T00:00:00`;
        const { data } = await supabase
            .from('tickets')
            .select('assigned_to, labor, other_charge, final_charges, spares')
            .eq('status', 'Closed')
            .gte('updated_at', from)
            .lt('updated_at', to);
        const result: Record<string, { calls: number; revenue: number }> = {};
        (data || []).forEach((t: any) => {
            const id = t.assigned_to || 'Unassigned';
            if (!result[id]) result[id] = { calls: 0, revenue: 0 };
            result[id].calls++;
            const parts = (t.spares || []).reduce((a: number, s: any) => a + (s.qty || 1) * (s.price || 0), 0);
            const rev = parseFloat(t.final_charges) || (parseFloat(t.labor) || 0) + (parseFloat(t.other_charge) || 0) + parts;
            result[id].revenue += rev;
        });
        return result;
    } catch { return {}; }
};