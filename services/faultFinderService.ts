import { supabase } from '@/lib/supabase';
import { FaultKnowledge, FaultKnowledgeForm, ModelError } from '@/types/faultFinder';

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

export const fetchModelErrors = async (): Promise<ModelError[]> => {
    try {
        const { data, error } = await supabase
            .from('model_errors')
            .select('*')
            .order('model_name');
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch model errors:', err);
        return [];
    }
};