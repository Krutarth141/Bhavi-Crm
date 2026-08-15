import { supabase } from '@/lib/supabase';
import { CatalogPart } from '@/types/partsCatalog';

export const fetchPartsCatalog = async (): Promise<CatalogPart[]> => {
    try {
        let data: any[] = [];
        let from = 0;
        const PAGE = 1000;
        while (true) {
            const { data: page, error } = await supabase
                .from('inventory')
                .select('part_code, item_name, category, qty_in_stock, unit_price, min_stock, warranty_qty')
                .order('item_name')
                .range(from, from + PAGE - 1);
            if (error) throw error;
            data = data.concat(page || []);
            if (!page || page.length < PAGE) break;
            from += PAGE;
        }
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