import { supabase } from '@/lib/supabase';
import { WorkLog } from '@/types/myCalls';

// Punch in for the day.
// Returns an error (without inserting) if a row already exists for eng_id + log_date.
export const punchIn = async (params: {
    eng_id: string;
    eng_name: string;
    log_date: string;
    punch_in_time: string;
    start_meter?: number;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { eng_id, eng_name, log_date, punch_in_time, start_meter } = params;

        // Check for existing punch-in
        const { data: existing, error: fetchError } = await supabase
            .from('punch_logs')
            .select('id')
            .eq('eng_id', eng_id)
            .eq('log_date', log_date)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
            return { success: false, error: 'Already punched in for this date.' };
        }

        const { error } = await supabase
            .from('punch_logs')
            .insert([{ eng_id, eng_name, log_date, punch_in_time, start_meter }]);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Punch out for the day.
// Updates the existing punch_logs row for eng_id + log_date.
export const punchOut = async (params: {
    eng_id: string;
    log_date: string;
    punch_out_time: string;
    end_meter?: number;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { eng_id, log_date, punch_out_time, end_meter } = params;

        const { error } = await supabase
            .from('punch_logs')
            .update({ punch_out_time, end_meter })
            .eq('eng_id', eng_id)
            .eq('log_date', log_date);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Save a work log entry.
export const saveWorkLog = async (
    entry: Omit<WorkLog, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
        const { data, error } = await supabase
            .from('work_logs')
            .insert([entry])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Delete a work log by id.
export const deleteWorkLog = async (
    id: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('work_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};
