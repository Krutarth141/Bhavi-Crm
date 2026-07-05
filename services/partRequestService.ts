import { supabase } from '@/lib/supabase';
import { PartRequest, PartRequestFilter } from '@/types/partRequest';

export const fetchPartRequests = async (filter: PartRequestFilter): Promise<PartRequest[]> => {
    try {
        let query = supabase
            .from('eng_part_requests')
            .select('*')
            .order('created_at', { ascending: false });
        if (filter !== 'all') query = query.eq('status', filter);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('fetchPartRequests:', err);
        return [];
    }
};

export const approvePartRequest = async (
    req: PartRequest,
    approvedBy: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // 1. Update request status
        const { error: statusError } = await supabase
            .from('eng_part_requests')
            .update({
                status: 'approved',
                approved_by: approvedBy,
                approved_at: new Date().toISOString(),
            })
            .eq('id', req.id);
        if (statusError) throw statusError;

        // 2. For each part — upsert eng_stock + decrement inventory
        const parts = req.parts || [];
        for (const part of parts) {
            if (!part.part_id) continue;

            // Upsert eng_stock
            const { data: existing } = await supabase
                .from('eng_stock')
                .select('id, qty')
                .eq('owner', req.engineer_name)
                .eq('part_id', part.part_id)
                .maybeSingle();

            if (existing) {
                await supabase.from('eng_stock')
                    .update({ qty: existing.qty + (part.qty || 1) })
                    .eq('id', existing.id);
            } else {
                await supabase.from('eng_stock')
                    .insert([{ owner: req.engineer_name, part_id: part.part_id, qty: part.qty || 1 }]);
            }

            // Decrement inventory
            const { data: inv } = await supabase
                .from('inventory')
                .select('id, qty_in_stock')
                .eq('id', part.part_id)
                .single();
            if (inv) {
                await supabase.from('inventory')
                    .update({ qty_in_stock: (inv.qty_in_stock || 0) - (part.qty || 1) })
                    .eq('id', part.part_id);
            }
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const rejectPartRequest = async (
    id: string,
    approvedBy: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('eng_part_requests')
            .update({
                status: 'rejected',
                approved_by: approvedBy,
                approved_at: new Date().toISOString(),
                notes: reason || undefined,
            })
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};