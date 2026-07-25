import { supabase } from '@/lib/supabase';
import { InventoryItem, InventoryPurchase } from '@/types/inventory';

export const fetchPurchases = async (): Promise<InventoryPurchase[]> => {
    try {
        const { data, error } = await supabase.from('inventory_purchases').select('*').order('purchase_date', { ascending: false }).limit(500);
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchPurchases:', err); return []; }
};

export const checkInvoiceDuplicate = async (invoiceNo: string): Promise<InventoryPurchase | null> => {
    if (!invoiceNo.trim()) return null;
    try {
        const { data } = await supabase.from('inventory_purchases').select('*').eq('invoice_no', invoiceNo.trim()).limit(1);
        return data?.[0] || null;
    } catch { return null; }
};

export const savePurchaseInvoice = async (params: {
    date: string;
    supplier: string;
    invoiceNo: string;
    note: string;
    rows: { code: string; name: string; qty: number; dtp: number; gst: number; mrp: number }[];
    inventory: InventoryItem[];
    addedBy: string;
}): Promise<{ success: boolean; savedCount?: number; error?: string }> => {
    try {
        let saved = 0;
        for (const r of params.rows) {
            const inv = params.inventory.find(i => (i.part_code || '').toUpperCase() === r.code);

            await supabase.from('inventory_purchases').insert([{
                purchase_date: params.date, part_code: r.code, part_name: r.name || inv?.item_name || r.code,
                supplier: params.supplier, qty: r.qty, unit_cost: r.dtp,
                invoice_no: params.invoiceNo, total_cost: r.qty * r.dtp,
                note: params.note || null, added_by: params.addedBy,
            }]);

            if (inv) {
                const newQty = (inv.qty_in_stock || 0) + r.qty;
                const patch: any = { qty_in_stock: newQty, updated_at: new Date().toISOString() };
                if (r.dtp > 0) patch.purchase_price = r.dtp;
                if (r.mrp > 0) patch.unit_price = r.mrp;
                if (r.gst >= 0) patch.gst_pct = r.gst;
                await supabase.from('inventory').update(patch).eq('id', inv.id);
                await supabase.from('inventory_log').insert([{
                    inventory_id: inv.id, type: 'in', qty: r.qty,
                    note: `Purchase INV:${params.invoiceNo} | ${params.supplier}`, done_by: params.addedBy,
                }]).then(() => { }, () => { });
            } else {
                const { data: created } = await supabase.from('inventory').insert([{
                    part_code: r.code, item_name: r.name || r.code, qty_in_stock: r.qty,
                    purchase_price: r.dtp || 0, unit_price: r.mrp || 0, gst_pct: r.gst || 18,
                    updated_at: new Date().toISOString(),
                }]).select().single();
                if (created) {
                    await supabase.from('inventory_log').insert([{
                        inventory_id: created.id, type: 'in', qty: r.qty,
                        note: `New item — Purchase INV:${params.invoiceNo} | ${params.supplier}`, done_by: params.addedBy,
                    }]).then(() => { }, () => { });
                }
            }
            saved++;
        }
        return { success: true, savedCount: saved };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};