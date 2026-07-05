import { supabase } from '@/lib/supabase';
import { EngineerTicket } from '@/types/engineerUpdate';

export const fetchEngineerTickets = async (
    engineerName: string,
    statusFilter: 'active' | 'closed' | 'all'
): Promise<EngineerTicket[]> => {
    try {
        let query = supabase
            .from('tickets')
            .select('id, js_no, cname, mobile, model, serial, brand_name, problem, call_type, service_type, assigned_name, status, service_charges, labor, address, pin, timeline, created_at, updated_at')
            .order('updated_at', { ascending: false });

        if (engineerName) query = query.eq('assigned_name', engineerName);

        if (statusFilter === 'active') {
            query = query.not('status', 'in', '("Closed","Call Cancel","Customer Reject")');
        } else if (statusFilter === 'closed') {
            query = query.in('status', ['Closed', 'Call Cancel', 'Customer Reject']);
        }

        const { data, error } = await query.limit(100);
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('fetchEngineerTickets:', err);
        return [];
    }
};

export const updateTicketStatus = async (
    ticket: EngineerTicket,
    newStatus: string,
    note: string,
    labour: string,
    updatedBy: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const existing = ticket.timeline || [];
        const updateData: any = {
            status: newStatus,
            updated_at: new Date().toISOString(),
            last_status_by: updatedBy,
            timeline: [...existing, {
                action: `Status → ${newStatus}`,
                by: updatedBy,
                at: new Date().toISOString(),
                note: note || undefined,
            }],
        };
        if (labour && newStatus === 'Closed') {
            updateData.labor = Number(labour);
        }
        if (note) updateData.eng_remarks = note;

        const { error } = await supabase.from('tickets').update(updateData).eq('id', ticket.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};