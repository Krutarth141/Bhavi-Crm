import { supabase } from '@/lib/supabase';
import { EngMovement } from '@/types/engParts';

// ─── Internal helpers ──────────────────────────────────────────────────────────

const engStockAdjust = async (owner: string, partId: string, delta: number) => {
    const { data: existing } = await supabase.from('eng_stock').select('id, qty').eq('owner', owner).eq('part_id', partId).maybeSingle();
    const newQty = Math.max(0, (existing?.qty || 0) + delta);
    if (existing) {
        await supabase.from('eng_stock').update({ qty: newQty, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
        await supabase.from('eng_stock').insert([{ owner, part_id: partId, qty: newQty }]);
    }
};

const invQtyAdjust = async (partId: string, delta: number) => {
    const { data: item } = await supabase.from('inventory').select('qty_in_stock').eq('id', partId).single();
    const newQty = Math.max(0, (item?.qty_in_stock || 0) + delta);
    await supabase.from('inventory').update({ qty_in_stock: newQty, updated_at: new Date().toISOString() }).eq('id', partId);
};

const logMovement = async (m: Omit<EngMovement, 'id' | 'created_at'>) => {
    await supabase.from('eng_movements').insert([m]);
};

export const fetchEngMovements = async (): Promise<EngMovement[]> => {
    try {
        const { data, error } = await supabase.from('eng_movements').select('*').order('created_at', { ascending: false }).limit(500);
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchEngMovements:', err); return []; }
};

// ─── Issue parts to engineer (office → field) ─────────────────────────────────

export const issueToEngineer = async (params: {
    part_id: string; eng_name: string; qty: number; ticket_id?: string; note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, eng_name, qty, note } = params;
        await invQtyAdjust(part_id, -qty);
        await engStockAdjust(eng_name, part_id, qty);
        await logMovement({ type: 'ISSUE', part_id, qty, from_owner: 'MAIN', to_owner: eng_name, notes: note || null });
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Record usage (consumed on a job) ─────────────────────────────────────────

export const recordUsage = async (params: {
    part_id: string; eng_name: string; qty: number; ticket_id?: string; note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, eng_name, qty, ticket_id, note } = params;
        await engStockAdjust(eng_name, part_id, -qty);
        await logMovement({ type: 'USE', part_id, qty, from_owner: eng_name, to_owner: null, job_sheet: ticket_id || null, notes: note || null });
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Engineer returns unused part → back to office stock ─────────────────────

export const engineerReturn = async (params: {
    part_id: string; eng_name: string; qty: number; note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, eng_name, qty, note } = params;
        await engStockAdjust(eng_name, part_id, -qty);
        await invQtyAdjust(part_id, qty);
        await logMovement({ type: 'ENG_RETURN', part_id, qty, from_owner: eng_name, to_owner: 'MAIN', notes: note || null });
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Warranty return (Canon receives the part back) ───────────────────────────

export const warrantyReturn = async (params: {
    part_id: string; eng_name: string; qty: number; note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, qty, note } = params;
        await invQtyAdjust(part_id, qty);
        await logMovement({ type: 'WARRANTY_RETURN', part_id, qty, from_owner: 'COMPANY', to_owner: 'MAIN', warranty: true, notes: note || null });
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};