import { supabase } from '@/lib/supabase';
import { ApprovalTicket, ApprovalSpare } from '@/types/customerApproval';

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

// Inspection/Visit Charges are mandatory on rejection — the visit still gets
// billed even though the customer declined the repair (matches HTML's
// processApproval('reject') prompt).
export const rejectTicket = async (
    ticket: ApprovalTicket,
    remark: string,
    inspectionCharges: number,
    rejectedBy: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const existing = ticket.timeline || [];
        const { error } = await supabase.from('tickets').update({
            status: 'Customer Reject',
            final_charges: inspectionCharges,
            labor: inspectionCharges,
            updated_at: new Date().toISOString(),
            last_status_by: rejectedBy,
            timeline: [...existing, {
                action: 'Customer Rejected',
                by: rejectedBy,
                at: new Date().toISOString(),
                note: remark,
            }, {
                action: 'Inspection Charges Set',
                by: rejectedBy,
                at: new Date().toISOString(),
                note: `Final Inspection Charges: ₹${inspectionCharges}`,
            }],
        }).eq('id', ticket.id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

// Removes one part from the estimate mid-review. If that empties the list,
// reverts the ticket to In Progress for the engineer to close directly.
export const removeApprovalPart = async (
    ticket: ApprovalTicket,
    idx: number,
    byUser: string
): Promise<{ success: boolean; error?: string; allRemoved?: boolean; spares?: ApprovalSpare[] }> => {
    try {
        const spares = [...(ticket.spares || [])];
        spares.splice(idx, 1);
        const updateData: any = { spares, updated_at: new Date().toISOString() };
        if (spares.length === 0) {
            updateData.status = 'In Progress';
            updateData.timeline = [...(ticket.timeline || []), {
                action: 'Parts Removed — Back to In Progress',
                by: byUser,
                at: new Date().toISOString(),
                note: 'All parts removed. Engineer to close.',
            }];
        }
        const { error } = await supabase.from('tickets').update(updateData).eq('id', ticket.id);
        if (error) throw error;
        return { success: true, allRemoved: spares.length === 0, spares };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};