import { supabase } from '@/lib/supabase';
import { SalesOrder } from '@/types/sales';

export const fetchSalesOrders = async (): Promise<SalesOrder[]> => {
    try {
        const { data, error } = await supabase
            .from('sales_orders')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSalesOrders:', err); return []; }
};

export const updateSalesOrderStatus = async (id: string, status: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('sales_orders').update({ status }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};