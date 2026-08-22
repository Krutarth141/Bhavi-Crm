import { supabase } from '@/lib/supabase';
import { EngineerTicket } from '@/types/engineerUpdate';
import { notifyStatusChange } from './telegramNotify';

const TICKET_COLUMNS = 'id, job_sheet, cname, mobile, model, serial, brand_name, problem, fault_code, call_type, service_type, warranty_coverage, warranty_claim_pending, assigned_name, status, service_charges, labor, address, pin, timeline, spares, rerepair, rerepair_foc, created_at, updated_at, visit_in, visit_date, visit_out, meter_start, meter_end, se_call_id, page_count, other_charge, wc_type';

export const fetchEngineerTickets = async (
    engineerName: string,
    statusFilter: 'active' | 'closed' | 'all'
): Promise<EngineerTicket[]> => {
    try {
        let query = supabase
            .from('tickets')
            .select(TICKET_COLUMNS)
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
            .select(TICKET_COLUMNS)
            .eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('fetchTicketById:', err);
        return null;
    }
};

export interface UpdateExtra {
    seCallId?: string;
    pageCount?: string;
    pageCountSkip?: boolean;
    pageCountSkipReason?: string;
    otherCharge?: string;
    visitDate?: string;
    visitIn?: string;
    visitOut?: string;
    meterStart?: string;
    meterEnd?: string;
    mscCenter?: string;
}

export const updateTicketStatus = async (
    ticket: EngineerTicket,
    newStatus: string,
    note: string,
    labour: string,
    updatedBy: string,
    faultCode: string,
    extra?: UpdateExtra
): Promise<{ success: boolean; error?: string }> => {
    try {
        const existing = ticket.timeline || [];
        const isMsc = newStatus === 'Sent to MSC';
        const timelineNote = isMsc
            ? (extra?.mscCenter ? `MSC Center: ${extra.mscCenter}` : note || undefined)
            : (note || undefined);
        const updateData: any = {
            status: newStatus,
            fault_code: faultCode || '',
            updated_at: new Date().toISOString(),
            last_status_by: updatedBy,
            timeline: [...existing, {
                action: isMsc ? 'Sent to MSC' : `Status → ${newStatus}`,
                by: updatedBy,
                at: new Date().toISOString(),
                note: timelineNote,
            }],
        };
        if (labour && newStatus === 'Closed') updateData.labor = Number(labour);
        if (note) updateData.eng_remarks = note;

        if (extra?.seCallId) updateData.se_call_id = extra.seCallId;
        if (ticket.wc_type === 'CSP' && (extra?.pageCount || extra?.pageCountSkipReason)) {
            updateData.page_count = extra.pageCount ? Number(extra.pageCount) : null;
            updateData.page_count_skip_reason = extra.pageCountSkip ? (extra.pageCountSkipReason || '') : null;
        }
        if (extra?.otherCharge) updateData.other_charge = Number(extra.otherCharge);
        if (ticket.service_type === 'On Site') {
            if (extra?.visitDate) updateData.visit_date = extra.visitDate;
            if (extra?.visitIn) updateData.visit_in = extra.visitIn;
            if (extra?.visitOut) updateData.visit_out = extra.visitOut;
            if (extra?.meterStart) updateData.meter_start = extra.meterStart;
            if (extra?.meterEnd) updateData.meter_end = extra.meterEnd;
        }

        const { error } = await supabase.from('tickets').update(updateData).eq('id', ticket.id);
        if (error) throw error;

        if (isMsc && extra?.mscCenter) {
            try {
                await supabase.from('auto_msc_dispatch').insert([{
                    ticket_id: ticket.id,
                    msc_center: extra.mscCenter,
                    dispatched_by: updatedBy,
                    dispatched_at: new Date().toISOString(),
                }]);
            } catch { /* best-effort — MSC dispatch log is non-critical */ }
        }

        notifyStatusChange(ticket, newStatus, note ? `📝 ${note}` : undefined);

        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};