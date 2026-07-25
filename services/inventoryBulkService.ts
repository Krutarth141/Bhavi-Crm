import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@/types/inventory';
import { Brand } from '@/types/masters';

export const deleteInventoryItems = async (ids: string[], inventory: InventoryItem[]): Promise<{ deleted: number; skipped: string[] }> => {
    let deleted = 0;
    const skipped: string[] = [];
    for (const id of ids) {
        const { error } = await supabase.from('inventory').delete().eq('id', id);
        if (error) {
            if (error.code === '23503' || (error.message || '').toLowerCase().includes('foreign key')) {
                const inv = inventory.find(i => i.id === id);
                skipped.push(inv?.item_name || id);
            }
        } else {
            deleted++;
        }
    }
    return { deleted, skipped };
};

export const bulkStockOutRows = async (rows: { code: string; qty: number; note: string }[], addedBy: string): Promise<{ success: number; errors: number; errorList: string[] }> => {
    let success = 0, errors = 0;
    const errorList: string[] = [];
    for (const row of rows) {
        try {
            const { data: inv, error } = await supabase.from('inventory').select('*').eq('part_code', row.code);
            if (error) throw error;
            if (!inv || !inv.length) { errorList.push(`${row.code}: Not found`); errors++; continue; }
            const current = inv[0].qty_in_stock || 0;
            if (current < row.qty) { errorList.push(`${row.code}: Insufficient stock (have ${current}, need ${row.qty})`); errors++; continue; }
            await supabase.from('inventory').update({ qty_in_stock: current - row.qty, updated_at: new Date().toISOString() }).eq('part_code', row.code);
            await supabase.from('inventory_log').insert([{ inventory_id: inv[0].id, type: 'out', qty: row.qty, note: row.note, done_by: addedBy }]);
            success++;
        } catch (e: any) {
            errorList.push(`${row.code}: ${e.message}`);
            errors++;
        }
    }
    return { success, errors, errorList };
};

export const importInventoryRows = async (
    rows: { part_code: string | null; item_name: string; brand: string; category: string; qty_in_stock: number; min_stock: number; purchase_price: number; unit_price: number; gst_pct: number }[],
    brands: Brand[]
): Promise<{ count: number; errors: number }> => {
    let count = 0, errors = 0;
    for (const row of rows) {
        try {
            const b = brands.find(x => x.name.toLowerCase() === (row.brand || '').toLowerCase());
            const { error } = await supabase.from('inventory').insert([{
                part_code: row.part_code, item_name: row.item_name, brand_id: b?.id || null, category: row.category,
                qty_in_stock: row.qty_in_stock, min_stock: row.min_stock, purchase_price: row.purchase_price,
                unit_price: row.unit_price, gst_pct: row.gst_pct,
            }]);
            if (error) throw error;
            count++;
        } catch (e) {
            errors++;
        }
    }
    return { count, errors };
};