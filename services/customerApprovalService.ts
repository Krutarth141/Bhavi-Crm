import { supabase } from '@/lib/supabase';
import { ApprovalTicket } from '@/types/customerApproval';

export const fetchPendingApprovals = async (): Promise<ApprovalTicket[]> => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('status', 'Pending Customer Approval')
            .order('updated_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('fetchPendingApprovals:', err);
        return [];
    }
};

export const approveTicket = async (
    ticket: ApprovalTicket,
    finalAmount: number,
    labour: number,
    remark: string,
    approvedBy: string
): Promise<{ success: boolean; newStatus?: string; error?: string }> => {
    try {
        // Auto-check stock to determine next status
        const spares = (ticket.spares || []).filter(s => s.requested && s.code);
        let allInStock = true;
        if (spares.length > 0) {
            for (const s of spares) {
                const { data: inv } = await supabase
                    .from('inventory')
                    .select('qty_in_stock')
                    .eq('part_code', s.code)
                    .single();
                if (!inv || (inv.qty_in_stock || 0) < (s.qty || 1)) {
                    allInStock = false;
                    break;
                }
            }
        }

        const newStatus = (!spares.length || allInStock)
            ? (ticket.service_type === 'Carry In' ? 'Pending Repair Carry In' : 'Pending Repair On Site')
            : 'Pending Parts';

        const existing = ticket.timeline || [];
        const { error } = await supabase.from('tickets').update({
            status: newStatus,
            final_charges: finalAmount,
            labor: labour,
            updated_at: new Date().toISOString(),
            last_status_by: approvedBy,
            timeline: [...existing, {
                action: 'Customer Approved',
                by: approvedBy,
                at: new Date().toISOString(),
                note: remark,
                estimate: finalAmount,
            }],
        }).eq('id', ticket.id);

        if (error) throw error;
        return { success: true, newStatus };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const rejectTicket = async (
    ticket: ApprovalTicket,
    remark: string,
    rejectedBy: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const existing = ticket.timeline || [];
        const { error } = await supabase.from('tickets').update({
            status: 'Customer Reject',
            updated_at: new Date().toISOString(),
            last_status_by: rejectedBy,
            timeline: [...existing, {
                action: 'Customer Rejected',
                by: rejectedBy,
                at: new Date().toISOString(),
                note: remark,
            }],
        }).eq('id', ticket.id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};