import { supabase } from '@/lib/supabase';
import { EngineerTicket } from '@/types/engineerUpdate';
import { notifyStatusChange } from './telegramNotify';

export const fetchEngineerTickets = async (
    engineerName: string,
    statusFilter: 'active' | 'closed' | 'all'
): Promise<EngineerTicket[]> => {
    try {
        let query = supabase
            .from('tickets')
            .select('id, job_sheet, cname, mobile, model, serial, brand_name, problem, fault_code, call_type, service_type, warranty_coverage, warranty_claim_pending, assigned_name, status, service_charges, labor, address, pin, timeline, spares, rerepair, rerepair_foc, created_at, updated_at, visit_in, visit_date')
            .order('updated_at', { ascending: false })
            .limit(100);

        if (engineerName) query = query.eq('assigned_name', engineerName);

        if (statusFilter === 'active') {
            query = query
                .neq('status', 'Closed')
                .neq('status', 'Call Cancel')
                .neq('status', 'Customer Reject');
        } else if (statusFilter === 'closed') {
            query = query.in('status', ['Closed', 'Call Cancel', 'Customer Reject']);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('fetchEngineerTickets:', err);
        return [];
    }
};

// Re-fetches a single ticket after a Visit/Work/Hold panel action so the open
// Update modal can reflect the fresh timeline without a full list reload.
export const fetchTicketById = async (id: string): Promise<EngineerTicket | null> => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('id, job_sheet, cname, mobile, model, serial, brand_name, problem, fault_code, call_type, service_type, warranty_coverage, warranty_claim_pending, assigned_name, status, service_charges, labor, address, pin, timeline, spares, rerepair, rerepair_foc, created_at, updated_at, visit_in, visit_date')
            .eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('fetchTicketById:', err);
        return null;
    }
};

export const updateTicketStatus = async (
    ticket: EngineerTicket,
    newStatus: string,
    note: string,
    labour: string,
    updatedBy: string,
    faultCode: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const existing = ticket.timeline || [];
        const updateData: any = {
            status: newStatus,
            fault_code: faultCode || '',
            updated_at: new Date().toISOString(),
            last_status_by: updatedBy,
            timeline: [...existing, {
                action: `Status → ${newStatus}`,
                by: updatedBy,
                at: new Date().toISOString(),
                note: note || undefined,
            }],
        };
        if (labour && newStatus === 'Closed') updateData.labor = Number(labour);
        if (note) updateData.eng_remarks = note;

        const { error } = await supabase.from('tickets').update(updateData).eq('id', ticket.id);
        if (error) throw error;

        notifyStatusChange(ticket, newStatus, note ? `📝 ${note}` : undefined);

        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};