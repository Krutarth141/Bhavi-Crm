import { supabase } from '@/lib/supabase';
import { AutoInventoryItem, AutoInventoryLog, AutoInventoryForm, StockTxnType } from '@/types/autoInventory';

export const fetchAutoInventory = async (): Promise<AutoInventoryItem[]> => {
    try {
        const { data, error } = await supabase.from('auto_inventory').select('*').order('brand').order('item_name');
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchAutoInventory:', err); return []; }
};

const formToRow = (form: AutoInventoryForm) => ({
    brand: form.brand.trim() || null,
    made_in: form.made_in.trim() || null,
    item_name: form.item_name.trim(),
    category: form.category.trim() || null,
    purchase_price: form.purchase_price ? Number(form.purchase_price) : 0,
    unit: form.unit || 'pcs',
    gst_percent: form.gst_percent ? Number(form.gst_percent) : 0,
    selling_price: form.selling_price ? Number(form.selling_price) : null,
    model_no: form.model_no.trim() || null,
    description: form.description.trim() || null,
    updated_at: new Date().toISOString(),
});

export const createAutoInventoryItem = async (form: AutoInventoryForm, doneBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const stock = form.stock_qty ? Number(form.stock_qty) : 0;
        const { data: inserted, error } = await supabase.from('auto_inventory')
            .insert([{ ...formToRow(form), stock_qty: stock }])
            .select().single();
        if (error) throw error;
        // Log opening stock as the item's first IN transaction (matches HTML).
        if (stock > 0 && inserted) {
            await supabase.from('auto_inventory_log').insert([{
                inventory_id: inserted.id, type: 'in', qty: stock,
                dealer_name: form.dealer.trim() || null,
                price_per_unit: form.purchase_price ? Number(form.purchase_price) : null,
                note: 'Opening stock', done_by: doneBy,
                created_at: new Date().toISOString(),
                txn_date: form.purchase_date || new Date().toISOString().slice(0, 10),
            }]).then(() => { }, () => { }); // graceful fail if log table missing
        }
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const updateAutoInventoryItem = async (id: number, form: AutoInventoryForm): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_inventory').update(formToRow(form)).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const deleteAutoInventoryItem = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_inventory').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

// One dated IN/OUT/Sell transaction: adjusts stock_qty and writes the log row.
export const recordStockTransaction = async (params: {
    item: AutoInventoryItem;
    type: StockTxnType;
    qty: number;
    date: string;
    doneBy: string;
    dealer?: string;
    purchasePrice?: number;
    customer?: string;
    invoiceNo?: string;
    sellPrice?: number;
    note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const current = params.item.stock_qty || 0;
        const newStock = params.type === 'in' ? current + params.qty : Math.max(0, current - params.qty);
        const { error } = await supabase.from('auto_inventory')
            .update({ stock_qty: newStock, updated_at: new Date().toISOString() })
            .eq('id', params.item.id);
        if (error) throw error;

        const logData: any = {
            inventory_id: params.item.id, type: params.type, qty: params.qty,
            done_by: params.doneBy, created_at: new Date().toISOString(), txn_date: params.date,
        };
        if (params.type === 'in') {
            logData.dealer_name = params.dealer || null;
            logData.price_per_unit = params.purchasePrice ?? null;
            logData.note = params.note || null;
        } else if (params.type === 'out') {
            logData.note = params.note || null;
        } else {
            logData.customer_name = params.customer || null;
            logData.invoice_no = params.invoiceNo || null;
            logData.price_per_unit = params.sellPrice ?? null;
            logData.note = params.note || null;
        }
        await supabase.from('auto_inventory_log').insert([logData]).then(() => { }, () => { });
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const fetchAutoInventoryLogs = async (inventoryId: number): Promise<AutoInventoryLog[]> => {
    try {
        const { data, error } = await supabase.from('auto_inventory_log').select('*')
            .eq('inventory_id', inventoryId).order('created_at', { ascending: false }).limit(100);
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchAutoInventoryLogs:', err); return []; }
};