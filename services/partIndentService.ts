import { supabase } from '@/lib/supabase';
import { TicketSpare } from '@/types/tickets';

export interface PartSearchResult {
    code: string;
    name: string;
    stock: number;
    price: number;
}

// Autocomplete search — engineers on an On Site call see their own bag stock
// (eng_stock), everyone else sees company stock (inventory.qty_in_stock).
export const searchPartsForIndent = async (
    query: string, isEngineerOnSite: boolean, engineerName: string
): Promise<PartSearchResult[]> => {
    if (!query || query.length < 2) return [];
    try {
        const { data: parts, error } = await supabase
            .from('inventory')
            .select('id, part_code, item_name, qty_in_stock, unit_price')
            .or(`part_code.ilike.%${query}%,item_name.ilike.%${query}%`)
            .limit(8);
        if (error) throw error;
        if (!parts || !parts.length) return [];

        if (isEngineerOnSite) {
            const { data: engStock } = await supabase
                .from('eng_stock')
                .select('part_id, qty')
                .eq('owner', engineerName);
            return parts.map((p) => {
                const es = (engStock || []).find((e: any) => e.part_id === p.id);
                return { code: p.part_code || '', name: p.item_name, stock: es?.qty || 0, price: p.unit_price || 0 };
            });
        }
        return parts.map((p) => ({ code: p.part_code || '', name: p.item_name, stock: p.qty_in_stock || 0, price: p.unit_price || 0 }));
    } catch (err) {
        console.error('searchPartsForIndent:', err);
        return [];
    }
};

interface IndentableTicket {
    id: string;
    call_type?: string;
    service_type?: string;
    warranty_coverage?: string;
    rerepair?: boolean;
    rerepair_foc?: boolean;
    service_charges?: number;
    spares?: TicketSpare[];
    timeline?: any[];
}

// Mirrors HTML's savePartRequest: checks engineer bag stock (On Site only),
// falls back to company stock, and auto-routes the ticket's status.
export const savePartIndent = async (
    ticket: IndentableTicket,
    part: { code: string; name: string; qty: number; note: string },
    byUser: string,
    isEngineerOnSite: boolean
): Promise<{ success: boolean; error?: string; newStatus?: string }> => {
    try {
        const { data: inv } = await supabase
            .from('inventory')
            .select('id, qty_in_stock, unit_price, gst_pct')
            .eq('part_code', part.code)
            .limit(1)
            .maybeSingle();

        let pendingEngStock = false;
        let pendingNoParts = false;
        let hasStock = (inv?.qty_in_stock || 0) > 0;

        if (isEngineerOnSite && inv) {
            const { data: esRow } = await supabase
                .from('eng_stock')
                .select('qty')
                .eq('owner', byUser)
                .eq('part_id', inv.id)
                .maybeSingle();
            const bagQty = esRow?.qty || 0;
            if (bagQty < part.qty) {
                if ((inv.qty_in_stock || 0) > 0) pendingEngStock = true; else pendingNoParts = true;
                hasStock = false;
            } else {
                hasStock = true;
            }
        }

        const isW = ['Warranty', 'Warranty Repeat', 'AMC'].includes(ticket.call_type || '');
        const isOOC = ticket.warranty_coverage === 'Out of Coverage';

        let newStatus: string;
        if (pendingEngStock) newStatus = 'Pending Engineer Stock';
        else if (pendingNoParts) newStatus = 'Pending Parts';
        else if (isW && !isOOC) newStatus = hasStock ? (ticket.service_type === 'Carry In' ? 'Pending Repair Carry In' : 'Pending Repair On Site') : 'Pending Parts';
        else newStatus = 'Pending Customer Approval';

        const partPrice = parseFloat(String(inv?.unit_price ?? 0)) || 0;
        const partGst = inv?.gst_pct != null ? parseFloat(String(inv.gst_pct)) : 18;

        const spares: TicketSpare[] = [
            ...(ticket.spares || []),
            { code: part.code, name: part.name, qty: part.qty, price: partPrice, gst_pct: partGst, requested: true, stock_deducted: false },
        ];

        const tlNote = pendingEngStock
            ? `Part: ${part.code} ${part.name} × ${part.qty} — In company stock, needs to be issued to engineer | ${part.note}`
            : pendingNoParts
                ? `Part: ${part.code} ${part.name} × ${part.qty} — Not in company stock, needs to be ordered | ${part.note}`
                : `Part: ${part.code} ${part.name} × ${part.qty} | ${part.note}`;

        let timeline = [...(ticket.timeline || []), { action: `Part Indented — ${newStatus}`, by: byUser, at: new Date().toISOString(), note: tlNote }];

        if (newStatus === 'Pending Customer Approval' && (ticket.rerepair_foc === true || (ticket.rerepair === true && !ticket.service_charges))) {
            timeline = [...timeline, { action: 'Re-Repair FOC — Part Estimate', by: byUser, at: new Date().toISOString(), note: 'Service charges waived. Parts estimate sent for approval.' }];
        }

        const { error } = await supabase.from('tickets').update({
            spares, status: newStatus, timeline, updated_at: new Date().toISOString(),
        }).eq('id', ticket.id);
        if (error) throw error;
        return { success: true, newStatus };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};