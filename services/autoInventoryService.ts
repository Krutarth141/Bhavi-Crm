import { supabase } from '@/lib/supabase';
import { AutoInventoryItem, AutoInventoryLog, AutoInventoryForm } from '@/types/autoInventory';

export const fetchAutoInventory = async (): Promise<AutoInventoryItem[]> => {
    try {
        const { data, error } = await supabase.from('auto_inventory').select('*').order('item_name');
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchAutoInventory:', err); return []; }
};

export const createAutoInventoryItem = async (form: AutoInventoryForm): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_inventory').insert([{
            brand: form.brand.trim() || null,
            item_name: form.item_name.trim(),
            category: form.category || null,
            purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
            stock_qty: form.stock_qty ? Number(form.stock_qty) : 0,
            unit: form.unit || 'pcs',
            gst_percent: form.gst_percent ? Number(form.gst_percent) : null,
            selling_price: form.selling_price ? Number(form.selling_price) : null,
            model_no: form.model_no.trim() || null,
            description: form.description.trim() || null,
            updated_at: new Date().toISOString(),
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const updateAutoInventoryQty = async (id: number, newQty: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_inventory').update({ stock_qty: newQty, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const addAutoInventoryLog = async (log: Omit<AutoInventoryLog, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_inventory_log').insert([log]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const fetchAutoInventoryLogs = async (inventoryId?: number): Promise<AutoInventoryLog[]> => {
    try {
        let query = supabase.from('auto_inventory_log').select('*').order('created_at', { ascending: false }).limit(200);
        if (inventoryId) query = query.eq('inventory_id', inventoryId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchAutoInventoryLogs:', err); return []; }
};