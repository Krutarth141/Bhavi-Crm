import { supabase } from '@/lib/supabase';
import { WalkInEntry } from '@/types/walkin';

export const getNextToken = async (date: string): Promise<number> => {
    try {
        const { data, error } = await supabase
            .from('walkin_log')
            .select('token_no')
            .eq('visit_date', date)
            .order('token_no', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            return (data[0].token_no ?? 0) + 1;
        }
        return 1;
    } catch (err) {
        console.error('Failed to get next token:', err);
        return 1;
    }
};

export const insertWalkIn = async (
    entry: Omit<WalkInEntry, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
        const { data, error } = await supabase
            .from('walkin_log')
            .insert([entry])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const updateWalkIn = async (
    id: string,
    data: Partial<WalkInEntry>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('walkin_log')
            .update(data)
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const deleteWalkIn = async (
    id: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('walkin_log')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};
