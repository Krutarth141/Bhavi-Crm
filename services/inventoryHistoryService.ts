import { supabase } from '@/lib/supabase';
import { InventoryLogEntry } from '@/types/inventory';

export const fetchInventoryLogs = async (inventoryId: string): Promise<InventoryLogEntry[]> => {
    try {
        const { data, error } = await supabase.from('inventory_log').select('*').eq('inventory_id', inventoryId).order('created_at', { ascending: false }).limit(100);
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchInventoryLogs:', err); return []; }
};

export interface TicketPartUsage {
    id: string;
    cname?: string;
    model?: string;
    assigned_name?: string;
    qty: number;
    price: number;
    stock_deducted: boolean;
    created_at?: string;
    status?: string;
}

export const fetchTicketUsage = async (partCode: string): Promise<TicketPartUsage[]> => {
    try {
        let data: any[] = [];
        let from = 0;
        const PAGE = 1000;
        while (true) {
            const { data: page, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false }).range(from, from + PAGE - 1);
            if (error) throw error;
            data = data.concat(page || []);
            if (!page || page.length < PAGE) break;
            from += PAGE;
        }
        const used = (data || []).filter((t: any) => (t.spares || []).some((s: any) => s.code === partCode));
        return used.map((t: any) => {
            const spare = (t.spares || []).find((s: any) => s.code === partCode);
            return {
                id: t.id, cname: t.cname, model: t.model, assigned_name: t.assigned_name,
                qty: spare?.qty || 1, price: spare?.price || 0, stock_deducted: !!spare?.stock_deducted,
                created_at: t.created_at, status: t.status,
            };
        });
    } catch (err) { console.error('fetchTicketUsage:', err); return []; }
};