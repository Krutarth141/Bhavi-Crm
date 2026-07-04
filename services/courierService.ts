import { supabase } from '@/lib/supabase';
import { CourierEntry, CourierReceiver } from '@/types/courier';

export const insertCourierEntry = async (
    entry: Omit<CourierEntry, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
        const { data, error } = await supabase
            .from('courier_log')
            .insert([entry])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const updateCourierStatus = async (
    id: string,
    status: 'pending' | 'received' | 'dispatched'
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('courier_log')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const insertReceiver = async (
    receiver: Omit<CourierReceiver, 'id'>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('courier_receivers')
            .insert([receiver]);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const updateReceiver = async (
    id: string,
    data: Partial<CourierReceiver>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('courier_receivers')
            .update(data)
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const deleteReceiver = async (
    id: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('courier_receivers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};
