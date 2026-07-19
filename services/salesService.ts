import { supabase } from '@/lib/supabase';
import { SalesOrder, SalesProduct, genOrderNo, calcGstFromInclusive } from '@/types/sales';

export const fetchSalesOrders = async (): Promise<SalesOrder[]> => {
    try {
        const { data, error } = await supabase.from('sales_orders').select('*').order('created_at', { ascending: false }).limit(200);
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSalesOrders:', err); return []; }
};

export const fetchActiveSalesProducts = async (): Promise<SalesProduct[]> => {
    try {
        const { data, error } = await supabase.from('sales_products').select('*').eq('is_active', true).eq('stock_status', 'available').order('name');
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchActiveSalesProducts:', err); return []; }
};

export const createSalesOrder = async (form: {
    customer_name: string; customer_mobile: string; customer_address: string; notes: string;
    items: { product_id: string; name: string; price: number; gst_percent: number; qty: number }[];
    createdBy: string;
}): Promise<{ success: boolean; error?: string; order?: SalesOrder }> => {
    try {
        const total = form.items.reduce((s, i) => s + i.price * i.qty, 0);
        const gstAmt = form.items.reduce((s, i) => s + calcGstFromInclusive(i.price * i.qty, i.gst_percent), 0);
        const data = {
            order_no: genOrderNo(),
            customer_name: form.customer_name,
            customer_mobile: form.customer_mobile,
            customer_address: form.customer_address,
            items: form.items,
            subtotal: Math.round((total - gstAmt) * 100) / 100,
            gst_amount: Math.round(gstAmt * 100) / 100,
            total_amount: Math.round(total * 100) / 100,
            notes: form.notes,
            status: 'inquiry',
            created_by: form.createdBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        const { data: inserted, error } = await supabase.from('sales_orders').insert([data]).select().single();
        if (error) throw error;
        return { success: true, order: inserted };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const markSalesStatus = async (id: string, status: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('sales_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

export const recordSalesPayment = async (id: string, method: string, reference: string, date: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('sales_orders').update({
            status: 'paid', payment_method: method, payment_reference: reference, payment_date: date, updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

export const recordSalesDispatch = async (id: string, courier: string, awb: string, date: string, trackUrl: string, notes: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const trackInfo = `${courier} | AWB: ${awb}${trackUrl ? ` | ${trackUrl}` : ''}`;
        const { error } = await supabase.from('sales_orders').update({
            status: 'dispatched', courier_name: courier, awb_number: awb, dispatch_date: date,
            tracking_url: trackUrl || null, tracking_info: trackInfo, notes: notes || undefined, updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

export const recordSalesDelivery = async (id: string, note: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('sales_orders').update({
            status: 'done', delivery_date: new Date().toLocaleDateString('en-CA'), delivery_note: note || null, updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

export const fetchAllSalesProducts = async (): Promise<SalesProduct[]> => {
    try {
        const { data, error } = await supabase.from('sales_products').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchAllSalesProducts:', err); return []; }
};

export const saveSalesProduct = async (id: string | null, data: Partial<SalesProduct>): Promise<{ success: boolean; error?: string }> => {
    try {
        if (id) {
            const { error } = await supabase.from('sales_products').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('sales_products').insert([{ ...data, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
            if (error) throw error;
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const deactivateSalesProduct = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('sales_products').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

export const bulkImportSalesProducts = async (products: Partial<SalesProduct>[]): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
        const rows = products.map(p => ({ ...p, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
        const { error } = await supabase.from('sales_products').insert(rows);
        if (error) throw error;
        return { success: true, count: rows.length };
    } catch (err) { return { success: false, error: String(err) }; }
};