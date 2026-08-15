import { supabase } from '@/lib/supabase';
import { ReorderItem } from '@/types/reorder';

export const fetchReorderInventory = async (): Promise<ReorderItem[]> => {
    try {
        let all: ReorderItem[] = [];
        let from = 0;
        const PAGE = 1000;
        while (true) {
            const { data: page, error } = await supabase
                .from('inventory')
                .select('id, item_name, part_code, category, qty_in_stock, min_stock')
                .order('item_name', { ascending: true })
                .range(from, from + PAGE - 1);
            if (error) throw error;
            all = all.concat(page || []);
            if (!page || page.length < PAGE) break;
            from += PAGE;
        }
        return all;
    } catch (err) { console.error('fetchReorderInventory:', err); return []; }
};

export const setMinStock = async (id: string, minStock: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('inventory').update({ min_stock: minStock }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};