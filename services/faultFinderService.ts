import { supabase } from '@/lib/supabase';
import { FaultKnowledge, FaultKnowledgeForm } from '@/types/faultFinder';

export const fetchFaultKnowledge = async (): Promise<FaultKnowledge[]> => {
    try {
        const { data, error } = await supabase
            .from('fault_knowledge')
            .select('*')
            .order('model_name');
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch fault knowledge:', err);
        return [];
    }
};

export const createFaultKnowledge = async (
    form: FaultKnowledgeForm
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('fault_knowledge').insert([{
            model_name: form.model_name.trim(),
            fault_type: form.fault_type.trim(),
            description: form.description.trim() || null,
            solution: form.solution.trim() || null,
            part_required: form.part_required.trim() || null,
            severity: form.severity,
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to create fault knowledge:', err);
        return { success: false, error: (err as any).message };
    }
};

export const fetchTicketModels = async (): Promise<string[]> => {
    try {
        const { data, error } = await supabase.from('tickets').select('model').limit(2000);
        if (error) throw error;
        const set = new Set<string>();
        (data || []).forEach((t: any) => { if (t.model && t.model.trim()) set.add(t.model.trim()); });
        return Array.from(set);
    } catch (err) {
        console.error('Failed to fetch ticket models:', err);
        return [];
    }
};


export const updateFaultKnowledge = async (
    id: string, form: FaultKnowledgeForm
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('fault_knowledge').update({
            model_name: form.model_name.trim(),
            fault_type: form.fault_type.trim(),
            description: form.description.trim() || null,
            solution: form.solution.trim() || null,
            part_required: form.part_required.trim() || null,
            severity: form.severity,
            updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to update fault knowledge:', err);
        return { success: false, error: (err as any).message };
    }
};

export const deleteFaultKnowledge = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('fault_knowledge').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to delete fault knowledge:', err);
        return { success: false, error: (err as any).message };
    }
};

export const bulkImportFaultKnowledge = async (
    rows: { model_name: string; fault_type: string; description: string; solution: string; part_required: string; severity: string }[]
): Promise<{ ok: number; fail: number }> => {
    let ok = 0, fail = 0;
    for (const row of rows) {
        if (!row.model_name || !row.fault_type) { fail++; continue; }
        try {
            const { error } = await supabase.from('fault_knowledge').insert([{
                model_name: row.model_name, fault_type: row.fault_type,
                description: row.description || null, solution: row.solution || null,
                part_required: row.part_required || null, severity: row.severity || 'Medium',
            }]);
            if (error) throw error;
            ok++;
        } catch {
            fail++;
        }
    }
    return { ok, fail };
};