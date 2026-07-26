import { supabase } from '@/lib/supabase';
import { CourierEntry, CourierReceiver } from '@/types/courier';

export const insertCourierEntry = async (
    entry: Omit<CourierEntry, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
        const { data, error } = await supabase
            .from('courier_log')
            .insert([{ ...entry, created_at: new Date().toISOString() }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const updateCourierEntry = async (
    id: string,
    data: Partial<CourierEntry>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('courier_log')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const fetchCourierEntry = async (id: string): Promise<CourierEntry | null> => {
    const { data, error } = await supabase.from('courier_log').select('*').eq('id', id).single();
    if (error) return null;
    return data;
};

export const insertReceiver = async (
    receiver: Omit<CourierReceiver, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('receiver_master')
            .insert([{ ...receiver, created_at: new Date().toISOString() }]);

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
            .from('receiver_master')
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
            .from('receiver_master')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const importReceivers = async (
    rows: { name: string; address: string; city: string; state: string; pin: string; phone: string }[]
): Promise<number> => {
    let count = 0;
    for (const row of rows) {
        if (!row.name) continue;
        try {
            const { error } = await supabase.from('receiver_master').insert([{ ...row, created_at: new Date().toISOString() }]);
            if (!error) count++;
        } catch { /* skip row, continue import */ }
    }
    return count;
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const genDCNo = async (): Promise<string> => {
    const now = new Date();
    const prefix = `BEL/${MONTHS[now.getMonth()]}-${now.getFullYear()}/`;
    try {
        const { data, error } = await supabase
            .from('courier_log')
            .select('dc_no')
            .eq('direction', 'Outward')
            .like('dc_no', `${prefix}%`)
            .order('dc_no', { ascending: false })
            .limit(1);
        if (error) throw error;
        let lastNo = 0;
        if (data && data.length && data[0].dc_no) {
            const parts = data[0].dc_no.split('/');
            lastNo = parseInt(parts[parts.length - 1]) || 0;
        }
        return prefix + String(lastNo + 1).padStart(3, '0');
    } catch {
        return prefix + '001';
    }
};