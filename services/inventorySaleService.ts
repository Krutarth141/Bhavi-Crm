import { supabase } from '@/lib/supabase';
import { InventoryItem, InventorySale } from '@/types/inventory';

export const fetchSales = async (): Promise<InventorySale[]> => {
    try {
        const { data, error } = await supabase.from('inventory_sales').select('*').order('sale_date', { ascending: false }).limit(500);
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSales:', err); return []; }
};

export const saveManualSale = async (params: {
    date: string;
    saleType: 'dealer' | 'customer';
    customer: string;
    mobile: string;
    partCode: string;
    partName: string;
    availStock: number;
    qty: number;
    price: number;
    note: string;
    inventory: InventoryItem[];
    addedBy: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        if (params.qty > params.availStock) return { success: false, error: `Insufficient stock! Available: ${params.availStock}` };

        await supabase.from('inventory_sales').insert([{
            sale_date: params.date, part_code: params.partCode, part_name: params.partName,
            sale_type: params.saleType, customer_name: params.customer, mobile: params.mobile || null,
            qty: params.qty, unit_price: params.price, total_amount: params.qty * params.price,
            note: params.note || null, added_by: params.addedBy,
        }]);

        const inv = params.inventory.find(i => i.part_code === params.partCode);
        if (inv) {
            await supabase.from('inventory').update({
                qty_in_stock: Math.max(0, (inv.qty_in_stock || 0) - params.qty), updated_at: new Date().toISOString(),
            }).eq('id', inv.id);
            await supabase.from('inventory_log').insert([{
                inventory_id: inv.id, type: 'out', qty: params.qty,
                note: `Manual Sale to ${params.customer}`, done_by: params.addedBy,
            }]).then(() => { }, () => { });
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};