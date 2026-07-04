import { supabase } from '@/lib/supabase';

// ─── Issue parts to engineer ──────────────────────────────────────────────────
// eng_part_requests: action='Issue', status='approved'
// eng_stock: upsert (increment qty)
// inventory: decrement qty_in_stock

export const issueToEngineer = async (params: {
    part_id: string;
    eng_name: string;
    qty: number;
    ticket_id?: string;
    note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, eng_name, qty, ticket_id, note } = params;

        // Log in eng_part_requests
        const { error: logError } = await supabase
            .from('eng_part_requests')
            .insert([{ action: 'Issue', part_id, eng_name, qty, ticket_id, note, status: 'approved' }]);
        if (logError) throw logError;

        // Upsert eng_stock
        const { data: existing } = await supabase
            .from('eng_stock')
            .select('id, qty')
            .eq('owner', eng_name)
            .eq('part_id', part_id)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase.from('eng_stock').update({ qty: existing.qty + qty }).eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('eng_stock').insert([{ owner: eng_name, part_id, qty }]);
            if (error) throw error;
        }

        // Decrement inventory
        const { data: inv, error: invErr } = await supabase.from('inventory').select('id, qty_in_stock').eq('id', part_id).single();
        if (invErr) throw invErr;
        const { error: invUpd } = await supabase.from('inventory').update({ qty_in_stock: (inv.qty_in_stock ?? 0) - qty }).eq('id', part_id);
        if (invUpd) throw invUpd;

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Record usage ─────────────────────────────────────────────────────────────

export const recordUsage = async (params: {
    part_id: string;
    eng_name: string;
    qty: number;
    ticket_id?: string;
    note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, eng_name, qty, ticket_id, note } = params;

        const { error: logError } = await supabase
            .from('eng_part_requests')
            .insert([{ action: 'Use', part_id, eng_name, qty, ticket_id, note, status: 'approved' }]);
        if (logError) throw logError;

        const { data: existing, error: fetchError } = await supabase
            .from('eng_stock').select('id, qty').eq('owner', eng_name).eq('part_id', part_id).single();
        if (fetchError) throw fetchError;

        const { error } = await supabase.from('eng_stock').update({ qty: existing.qty - qty }).eq('id', existing.id);
        if (error) throw error;

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Engineer return ──────────────────────────────────────────────────────────

export const engineerReturn = async (params: {
    part_id: string;
    eng_name: string;
    qty: number;
    note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, eng_name, qty, note } = params;

        const { error: logError } = await supabase
            .from('eng_part_requests')
            .insert([{ action: 'Return', part_id, eng_name, qty, note, status: 'approved' }]);
        if (logError) throw logError;

        const { data: existing, error: fetchError } = await supabase
            .from('eng_stock').select('id, qty').eq('owner', eng_name).eq('part_id', part_id).single();
        if (fetchError) throw fetchError;

        const { error: stockErr } = await supabase.from('eng_stock').update({ qty: existing.qty - qty }).eq('id', existing.id);
        if (stockErr) throw stockErr;

        // Increment inventory
        const { data: inv, error: invErr } = await supabase.from('inventory').select('id, qty_in_stock').eq('id', part_id).single();
        if (invErr) throw invErr;
        const { error: invUpd } = await supabase.from('inventory').update({ qty_in_stock: (inv.qty_in_stock ?? 0) + qty }).eq('id', part_id);
        if (invUpd) throw invUpd;

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Request parts (engineer requests, pending admin approval) ────────────────

export const requestParts = async (params: {
    part_id: string;
    eng_name: string;
    qty: number;
    note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('eng_part_requests')
            .insert([{ action: 'Request', ...params, status: 'pending' }]);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Approve request ──────────────────────────────────────────────────────────

export const approveRequest = async (
    id: string,
    part_id: string,
    eng_name: string,
    qty: number
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error: statusError } = await supabase
            .from('eng_part_requests').update({ status: 'approved' }).eq('id', id);
        if (statusError) throw statusError;

        const result = await issueToEngineer({ part_id, eng_name, qty });
        if (!result.success) throw new Error(result.error);

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Reject request ───────────────────────────────────────────────────────────

export const rejectRequest = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('eng_part_requests').update({ status: 'rejected' }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Warranty return ──────────────────────────────────────────────────────────

export const warrantyReturn = async (params: {
    part_id: string;
    eng_name: string;
    qty: number;
    note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error: logError } = await supabase
            .from('eng_part_requests')
            .insert([{ action: 'Warranty Return', ...params, status: 'approved' }]);
        if (logError) throw logError;

        const { data: existing, error: fetchError } = await supabase
            .from('eng_stock').select('id, qty').eq('owner', params.eng_name).eq('part_id', params.part_id).single();
        if (fetchError) throw fetchError;

        const { error } = await supabase.from('eng_stock').update({ qty: existing.qty - params.qty }).eq('id', existing.id);
        if (error) throw error;

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};