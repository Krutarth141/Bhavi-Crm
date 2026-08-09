import { supabase } from '@/lib/supabase';
import { ReorderItem } from '@/types/reorder';

export const fetchReorderInventory = async (): Promise<ReorderItem[]> => {
    try {
        const { data, error } = await supabase
            .from('inventory')
            .select('id, item_name, part_code, category, qty_in_stock, min_stock')
            .order('item_name', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchReorderInventory:', err); return []; }
};

export const setMinStock = async (id: string, minStock: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('inventory').update({ min_stock: minStock }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};