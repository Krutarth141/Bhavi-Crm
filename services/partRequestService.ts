import { supabase } from '@/lib/supabase';
import { PartRequest, PartRequestFilter } from '@/types/partRequest';

export const fetchPartRequests = async (filter: PartRequestFilter): Promise<PartRequest[]> => {
    try {
        let query = supabase
            .from('eng_part_requests')
            .select('*, inventory(item_name)')
            .order('created_at', { ascending: false });
        if (filter !== 'all') query = query.eq('status', filter);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((r: any) => ({
            ...r,
            part_name: r.inventory?.item_name || r.part_id,
        }));
    } catch (err) {
        console.error('fetchPartRequests:', err);
        return [];
    }
};

export const approvePartRequest = async (req: PartRequest): Promise<{ success: boolean; error?: string }> => {
    try {
        // 1. Update request status
        await supabase.from('eng_part_requests').update({
            status: 'approved',
            action: 'Issue',
            updated_at: new Date().toISOString(),
        }).eq('id', req.id);

        // 2. Upsert eng_stock
        const { data: existing } = await supabase
            .from('eng_stock')
            .select('id, qty')
            .eq('owner', req.eng_name)
            .eq('part_id', req.part_id)
            .maybeSingle();

        if (existing) {
            await supabase.from('eng_stock').update({ qty: existing.qty + (req.qty || 1) }).eq('id', existing.id);
        } else {
            await supabase.from('eng_stock').insert([{ owner: req.eng_name, part_id: req.part_id, qty: req.qty || 1 }]);
        }

        // 3. Decrement inventory
        const { data: inv } = await supabase
            .from('inventory')
            .select('id, qty_in_stock')
            .eq('id', req.part_id)
            .single();
        if (inv) {
            await supabase.from('inventory').update({
                qty_in_stock: (inv.qty_in_stock || 0) - (req.qty || 1),
            }).eq('id', req.part_id);
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const rejectPartRequest = async (id: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('eng_part_requests').update({
            status: 'rejected',
            note: reason || undefined,
            updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};