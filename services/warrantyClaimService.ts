import { supabase } from '@/lib/supabase';

// Minimal shared shape — both `Ticket` and `EngineerTicket` satisfy this,
// so these functions work from both TicketsScreen and EngineerUpdateScreen
// without depending on either concrete type.
export interface WarrantyTicketLike {
    id: string;
    cname?: string;
    model?: string;
    call_type?: string;
    timeline?: any[];
}

const appendTimeline = (ticket: WarrantyTicketLike, action: string, by: string, note: string) => [
    ...(ticket.timeline || []),
    { action, by, at: new Date().toISOString(), note },
];

export const submitWarrantyClaim = async (ticket: WarrantyTicketLike, invoice: string, note: string, submittedBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const claimNote = `Invoice: ${invoice}${note ? ` | ${note}` : ''}`;
        const timeline = appendTimeline(ticket, 'Warranty Claim Submitted', submittedBy, claimNote);
        const { error } = await supabase.from('tickets').update({
            warranty_claim_pending: true,
            warranty_claim_by: submittedBy,
            warranty_claim_note: claimNote,
            timeline,
            updated_at: new Date().toISOString(),
        }).eq('id', ticket.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const approveWarrantyClaim = async (ticket: WarrantyTicketLike, approvedBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const timeline = appendTimeline(ticket, 'Warranty Claim Approved', approvedBy, `Call converted to Warranty by ${approvedBy}`);
        const { error } = await supabase.from('tickets').update({
            call_type: 'Warranty',
            warranty_coverage: 'Under Coverage', // HTML used 'In Warranty' — not a real value in this app's vocabulary
            service_charges: 0,
            final_charges: 0,
            warranty_claim_pending: false,
            warranty_claim_approved: true,
            warranty_claim_approved_by: approvedBy,
            timeline,
            updated_at: new Date().toISOString(),
        }).eq('id', ticket.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const rejectWarrantyClaim = async (ticket: WarrantyTicketLike, reason: string, rejectedBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const timeline = appendTimeline(ticket, 'Warranty Claim Rejected', rejectedBy, reason || 'Rejected by WC/Admin');
        const { error } = await supabase.from('tickets').update({
            warranty_claim_pending: false,
            warranty_claim_approved: false,
            timeline,
            updated_at: new Date().toISOString(),
        }).eq('id', ticket.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// WC/Admin — simple void, no service-charge capture.
export const voidWarranty = async (ticket: WarrantyTicketLike, reason: string, byUser: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const timeline = appendTimeline(ticket, 'Warranty Void', byUser, reason);
        const { error } = await supabase.from('tickets').update({
            warranty_coverage: 'Out of Coverage',
            coverage_remark: reason,
            timeline,
            updated_at: new Date().toISOString(),
        }).eq('id', ticket.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Engineer — void + capture final service charges in the same step.
export const engVoidWarranty = async (ticket: WarrantyTicketLike, reason: string, serviceCharges: number, byUser: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const timeline = appendTimeline(ticket, 'Out of Coverage — Service Charges Set', byUser, `Reason: ${reason} | Service Charges: ₹${serviceCharges}`);
        const { error } = await supabase.from('tickets').update({
            warranty_coverage: 'Out of Coverage',
            coverage_remark: reason,
            service_charges: serviceCharges,
            labor: serviceCharges,
            timeline,
            updated_at: new Date().toISOString(),
        }).eq('id', ticket.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};