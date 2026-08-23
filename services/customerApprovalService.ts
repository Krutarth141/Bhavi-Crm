import { supabase } from '@/lib/supabase';
import { ApprovalTicket, ApprovalSpare } from '@/types/customerApproval';

export const fetchPendingApprovals = async (): Promise<ApprovalTicket[]> => {
    try {
        let all: ApprovalTicket[] = [];
        let from = 0;
        const PAGE = 1000;
        while (true) {
            const { data: page, error } = await supabase
                .from('tickets')
                .select('*')
                .eq('status', 'Pending Customer Approval')
                .order('updated_at', { ascending: false })
                .range(from, from + PAGE - 1);
            if (error) throw error;
            all = all.concat(page || []);
            if (!page || page.length < PAGE) break;
            from += PAGE;
        }
        return all;
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
        // Auto-check stock to determine the next status. Same 3-way rule the
        // mid-repair Request Part flow uses, so it behaves identically whether
        // Admin/WC or the engineer clicks Approve (index.html:6987-7021):
        //  - On Site: check the ASSIGNED ENGINEER's own bag (eng_stock). Already
        //    in their bag → Pending Repair On Site. In company inventory but not
        //    their bag → Pending Engineer Stock (admin must hand it over first).
        //    Nowhere → Pending Parts.
        //  - Carry In: only company inventory matters (no personal-bag concept,
        //    the device is at the office) → Pending Repair Carry In or Pending Parts.
        const spares = (ticket.spares || []).filter(s => s.requested && s.code);
        let anyPendingEngStock = false;
        let anyPendingNoParts = false;
        for (const s of spares) {
            try {
                const { data: invItem } = await supabase
                    .from('inventory')
                    .select('id, qty_in_stock')
                    .eq('part_code', s.code!)
                    .limit(1)
                    .maybeSingle();
                const companyQty = invItem?.qty_in_stock || 0;
                if (ticket.service_type === 'On Site') {
                    let bagQty = 0;
                    if (ticket.assigned_name && invItem) {
                        const { data: esRow } = await supabase
                            .from('eng_stock').select('qty')
                            .eq('owner', ticket.assigned_name).eq('part_id', invItem.id)
                            .limit(1).maybeSingle();
                        bagQty = esRow?.qty || 0;
                    }
                    if (bagQty < (s.qty || 1)) {
                        if (companyQty >= (s.qty || 1)) anyPendingEngStock = true; else anyPendingNoParts = true;
                    }
                } else if (companyQty < (s.qty || 1)) {
                    anyPendingNoParts = true;
                }
            } catch { anyPendingNoParts = true; }
        }

        let newStatus: string;
        let statusNote: string;
        if (!spares.length) {
            newStatus = ticket.service_type === 'Carry In' ? 'Pending Repair Carry In' : 'Pending Repair On Site';
            statusNote = 'No parts needed';
        } else if (anyPendingNoParts) {
            newStatus = 'Pending Parts';
            statusNote = 'Part(s) not in stock anywhere — waiting for order';
        } else if (anyPendingEngStock) {
            newStatus = 'Pending Engineer Stock';
            statusNote = 'Part(s) in company stock — waiting to be issued to engineer';
        } else {
            newStatus = ticket.service_type === 'Carry In' ? 'Pending Repair Carry In' : 'Pending Repair On Site';
            statusNote = 'All parts available';
        }

        // Clear "requested" on every spare the customer just approved. The
        // convention used EVERYWHERE else in the app (ticket-view total, every
        // Reports revenue calc, invoice generation) treats requested:true as
        // "still just an estimate, not billed yet" and filters it out of totals.
        // Approval is exactly the moment a requested part becomes a real,
        // billable, fitted part — without this flip, approved parts silently
        // vanish from every one of those totals forever, since nothing else in
        // the app ever clears the flag (index.html:7032-7033).
        const approvedSpares = (ticket.spares || []).map(s => (s.requested ? { ...s, requested: false } : s));

        const now = new Date().toISOString();
        const existing = ticket.timeline || [];
        const { error } = await supabase.from('tickets').update({
            status: newStatus,
            spares: approvedSpares,
            final_charges: finalAmount,
            labor: labour,
            updated_at: now,
            last_status_by: approvedBy,
            timeline: [...existing,
            { action: 'Customer Approved Estimate', by: approvedBy, at: now, note: remark, estimate: finalAmount },
            { action: `Auto → ${newStatus}`, by: 'System', at: now, note: statusNote },
            ],
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