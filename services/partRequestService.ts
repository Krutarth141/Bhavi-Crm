import { supabase } from '@/lib/supabase';
import { PartItem, PartRequest, PartRequestFilter } from '@/types/partRequest';

export const fetchPartRequests = async (filter: PartRequestFilter): Promise<PartRequest[]> => {
    try {
        let all: PartRequest[] = [];
        let from = 0;
        const PAGE = 1000;
        while (true) {
            let query = supabase
                .from('eng_part_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (filter !== 'all') query = query.eq('status', filter);
            const { data: page, error } = await query.range(from, from + PAGE - 1);
            if (error) throw error;
            all = all.concat(page || []);
            if (!page || page.length < PAGE) break;
            from += PAGE;
        }
        return all;
    } catch (err) {
        console.error('fetchPartRequests:', err);
        return [];
    }
};

// Engineer self-service: submit a new Request/Return, pending admin approval.
export const submitPartRequest = async (params: {
    engineer_id?: string;
    engineer_name: string;
    parts: PartItem[];
    notes?: string;
    type?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('eng_part_requests').insert([{
            type: params.type || 'RECEIVE',
            status: 'PENDING',
            engineer_id: params.engineer_id || null,
            engineer_name: params.engineer_name,
            parts: params.parts,
            notes: params.notes || null,
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const approvePartRequest = async (
    req: PartRequest,
    approvedBy: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error: statusError } = await supabase
            .from('eng_part_requests')
            .update({
                status: 'APPROVED',
                approved_by: approvedBy,
                approved_at: new Date().toISOString(),
            })
            .eq('id', req.id);
        if (statusError) throw statusError;

        const parts = req.parts || [];
        const isReturn = req.type === 'RETURN';

        for (const part of parts) {
            if (!part.part_id) continue;
            const qty = part.qty || 1;

            const { data: existing } = await supabase
                .from('eng_stock')
                .select('id, qty')
                .eq('owner', req.engineer_name)
                .eq('part_id', part.part_id)
                .maybeSingle();

            const delta = isReturn ? -qty : qty;
            if (existing) {
                await supabase.from('eng_stock')
                    .update({ qty: Math.max(0, existing.qty + delta) })
                    .eq('id', existing.id);
            } else if (!isReturn) {
                await supabase.from('eng_stock')
                    .insert([{ owner: req.engineer_name, part_id: part.part_id, qty }]);
            }

            const { data: inv } = await supabase
                .from('inventory')
                .select('id, qty_in_stock')
                .eq('id', part.part_id)
                .single();
            if (inv) {
                const invDelta = isReturn ? qty : -qty;
                await supabase.from('inventory')
                    .update({ qty_in_stock: Math.max(0, (inv.qty_in_stock || 0) + invDelta) })
                    .eq('id', part.part_id);
            }

            await supabase.from('eng_movements').insert([{
                type: isReturn ? 'ENG_RETURN' : 'ISSUE',
                part_id: part.part_id, qty,
                from_owner: isReturn ? req.engineer_name : 'MAIN',
                to_owner: isReturn ? 'MAIN' : req.engineer_name,
                notes: `Request by ${req.engineer_name}`, created_by: approvedBy,
            }]).then(() => { }, () => { });
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
                status: 'REJECTED',
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