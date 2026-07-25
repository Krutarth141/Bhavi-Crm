import { supabase } from '@/lib/supabase';
import { CatalogPart } from '@/types/partsCatalog';

export const fetchPartsCatalog = async (): Promise<CatalogPart[]> => {
    try {
        const { data, error } = await supabase
            .from('inventory')
            .select('part_code, item_name, category, qty_in_stock, unit_price, min_stock, warranty_qty')
            .order('item_name');
        if (error) throw error;
        return (data || []).map(i => ({
            code: i.part_code || '',
            name: i.item_name || '',
            model: i.category || '',
            stock: i.qty_in_stock || 0,
            wstock: i.warranty_qty || 0,
            price: i.unit_price || 0,
            min: i.min_stock || 0,
        }));
    } catch (err) {
        console.error('Failed to fetch parts catalog:', err);
        return [];
    }
};