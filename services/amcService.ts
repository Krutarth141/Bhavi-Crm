import { supabase } from '@/lib/supabase';
import { AMCContract, AMCFormData } from '@/types/amc';

export const fetchAMCContracts = async (): Promise<AMCContract[]> => {
    try {
        const { data, error } = await supabase
            .from('amc_contracts')
            .select('*')
            .order('amc_end', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch AMC contracts:', err);
        return [];
    }
};

export const createAMCContract = async (
    form: AMCFormData,
    createdBy: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('amc_contracts').insert([{
            customer_name: form.customer_name.trim(),
            mobile: form.mobile.trim() || null,
            product: form.product.trim() || null,
            serial_no: form.serial_no.trim() || null,
            amc_start: form.amc_start || null,
            amc_end: form.amc_end || null,
            amc_amount: form.amc_amount ? Number(form.amc_amount) : null,
            amc_type: form.amc_type || null,
            visits_included: form.visits_included ? Number(form.visits_included) : null,
            address: form.address.trim() || null,
            notes: form.notes.trim() || null,
            created_by: createdBy,
            updated_at: new Date().toISOString(),
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to create AMC contract:', err);
        return { success: false, error: (err as any).message };
    }
};

export const deleteAMCContract = async (
    id: number
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('amc_contracts')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to delete AMC contract:', err);
        return { success: false, error: (err as any).message };
    }
};