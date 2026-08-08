import { supabase } from '@/lib/supabase';
import { Ticket } from '@/types/tickets';

export const fetchAllTickets = async (): Promise<Ticket[]> => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch tickets:', err);
        return [];
    }
};

export const fetchAutocompleteTicketData = async (
    setAutocompleteBrands: (brands: string[]) => void,
    setAutocompleteModels: (models: string[]) => void,
    setAutocompleteProblems: (problems: string[]) => void
) => {
    try {
        const { data } = await supabase.from('tickets').select('brand_name, model, problem');

        if (data) {
            const brands = [...new Set(data.map((t: any) => t.brand_name).filter(Boolean))];
            const models = [...new Set(data.map((t: any) => t.model).filter(Boolean))];
            const problems = [...new Set(data.map((t: any) => t.problem).filter(Boolean))];

            setAutocompleteBrands(brands as string[]);
            setAutocompleteModels(models as string[]);
            setAutocompleteProblems(problems as string[]);
        }
    } catch (err) {
        console.error('Failed to fetch autocomplete data:', err);
    }
};

export const createTicket = async (ticketData: Partial<Ticket>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        const currentYear = new Date().getFullYear();

        // Fetch all tickets for current year to find highest sequence number
        const { data: allTickets } = await supabase
            .from('tickets')
            .select('id')
            .ilike('id', `BEA-${currentYear}-%`);

        let nextSequence = 1;
        if (allTickets && allTickets.length > 0) {
            const sequences = allTickets
                .map((t: any) => {
                    const match = t.id.match(/BEA-\d+-(\d+)/);
                    return match ? parseInt(match[1], 10) : 0;
                })
                .sort((a: number, b: number) => b - a);

            nextSequence = (sequences[0] || 0) + 1;
        }

        const newId = `BEA-${currentYear}-${String(nextSequence).padStart(3, '0')}`;

        // Auto-set status: if engineer assigned, status is "Assigned", otherwise "Pending Allocation"
        const dataToInsert = {
            ...ticketData,
            id: newId,
            job_sheet: newId,
            status: ticketData.assigned_to ? 'Assigned' : (ticketData.status || 'Pending Allocation'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('tickets').insert([dataToInsert]);

        if (error) throw error;
        return { success: true, id: newId };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const updateTicket = async (ticketId: string, updates: Partial<Ticket>): Promise<{ success: boolean; error?: string }> => {
    try {
        // Auto-update status based on engineer assignment:
        // If engineer is being assigned AND status is "Pending Allocation" → change to "Assigned"
        let finalUpdates = { ...updates };

        if (updates.assigned_to && (!updates.status || updates.status === 'Pending Allocation')) {
            finalUpdates.status = 'Assigned';
        } else if (!updates.assigned_to && updates.assigned_to !== undefined) {
            // If engineer is being removed → change back to "Pending Allocation" (only if no status override)
            if (!updates.status) {
                finalUpdates.status = 'Pending Allocation';
            }
        }

        const { error } = await supabase
            .from('tickets')
            .update({ ...finalUpdates, updated_at: new Date().toISOString() })
            .eq('id', ticketId);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const updateTicketRemarks = async (ticketId: string, remarks: string): Promise<{ success: boolean; error?: string }> => {
    return updateTicket(ticketId, { remarks });
};

export const markInvoiceDone = async (ticket: Ticket, invoiceNo: string, updatedBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const existing = ticket.timeline || [];
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('tickets')
            .update({
                invoice_done: true,
                invoice_no: invoiceNo,
                timeline: [...existing, { action: 'Invoice Done', by: updatedBy, at: now, note: `Invoice No: ${invoiceNo}` }],
                updated_at: now,
            })
            .eq('id', ticket.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const closeTicket = async (ticketId: string, finalRemarks?: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const updates: any = {
            status: 'Closed',
            updated_at: new Date().toISOString(),
        };

        if (finalRemarks) {
            updates.remarks = finalRemarks;
        }

        const { error } = await supabase
            .from('tickets')
            .update(updates)
            .eq('id', ticketId);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Fetch tickets assigned to a specific engineer
export const fetchTicketsByEngineer = async (engineerId: string): Promise<Ticket[]> => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('assigned_to', engineerId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch engineer tickets:', err);
        return [];
    }
};

// Fetch tickets based on user role
export const fetchTicketsForUser = async (userRole: string, userId: string): Promise<Ticket[]> => {
    try {
        // Admins and work controllers see all tickets
        if (userRole === 'admin' || userRole === 'work_controller') {
            return fetchAllTickets();
        }
        // Engineers see only their assigned tickets
        if (userRole === 'engineer') {
            return fetchTicketsByEngineer(userId);
        }
        return [];
    } catch (err) {
        console.error('Failed to fetch tickets for user:', err);
        return [];
    }
};

export const REPORT_EDIT_FIELDS: { key: keyof Ticket; label: string }[] = [
    { key: 'model', label: 'Model' },
    { key: 'serial', label: 'Serial No' },
    { key: 'call_type', label: 'Call Type' },
    { key: 'service_type', label: 'Service Type' },
    { key: 'cname', label: 'Customer Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'alt_mobile', label: 'Alt Mobile' },
    { key: 'problem', label: 'Problem' },
    { key: 'description', label: 'Description' },
    { key: 'condition', label: 'Condition' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'pin', label: 'Pin' },
    { key: 'area', label: 'Area' },
    { key: 'address', label: 'Address' },
    { key: 'se_call_id', label: 'SE Call ID' },
    { key: 'labor', label: 'Labor ₹' },
    { key: 'brand_name', label: 'Brand' },
];

export const submitReportEdit = async (
    ticket: Ticket, newValues: Record<string, string>, reason: string, requestedBy: string, wcId: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const changes: Record<string, { old: string; new: string }> = {};
        Object.entries(newValues).forEach(([k, nv]) => {
            const ov = String((ticket as any)[k] || '').trim();
            if (nv.trim() !== ov) changes[k] = { old: ov, new: nv.trim() };
        });
        if (!Object.keys(changes).length) return { success: false, error: 'No changes detected.' };
        const pending_edit = { requested_by: requestedBy, wc_id: wcId, requested_at: new Date().toISOString(), reason, changes };
        const { error } = await supabase.from('tickets').update({ pending_edit, updated_at: new Date().toISOString() }).eq('id', ticket.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const approveReportEdit = async (
    ticket: Ticket, approvedBy: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const pe = ticket.pending_edit;
        if (!pe) return { success: false, error: 'No pending edit found.' };
        const ch = pe.changes || {};
        const now = new Date().toISOString();
        const patch: Record<string, any> = { pending_edit: null, updated_at: now };
        ['cname', 'mobile', 'alt_mobile', 'city', 'address', 'area', 'pin', 'call_type', 'service_type', 'problem', 'description', 'model', 'serial', 'condition', 'se_call_id', 'labor', 'brand_name'].forEach(f => {
            if (ch[f]) patch[f] = ch[f].new;
        });
        const tl = ticket.timeline || [];
        const summary = Object.entries(ch).map(([k, v]) => `${k}: "${v.old}"→"${v.new}"`).join(' | ');
        patch.timeline = [...tl, { action: 'Report Edit Approved', by: approvedBy, at: now, note: `Edited by ${pe.requested_by}. Reason: ${pe.reason}. ${summary}` }];
        const { error } = await supabase.from('tickets').update(patch).eq('id', ticket.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const rejectReportEdit = async (
    ticket: Ticket, rejectedBy: string, reason: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const pe = ticket.pending_edit;
        if (!pe) return { success: false, error: 'No pending edit found.' };
        const now = new Date().toISOString();
        const tl = ticket.timeline || [];
        const patch = {
            pending_edit: null,
            timeline: [...tl, { action: 'Report Edit Rejected', by: rejectedBy, at: now, note: `Edit by ${pe.requested_by} rejected. Reason: ${reason || 'No reason given'}` }],
            updated_at: now,
        };
        const { error } = await supabase.from('tickets').update(patch).eq('id', ticket.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const backdateCloseTicket = async (
    ticket: Ticket,
    params: { date: string; engineerId: string; engineerName: string; reason: string; workDone?: string },
    byName: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date().toISOString();
        const existing = ticket.timeline || [];
        const { error } = await supabase
            .from('tickets')
            .update({
                status: 'Closed',
                assigned_to: params.engineerId,
                assigned_name: params.engineerName,
                work_done: params.workDone || ticket.work_done || '',
                visit_date: params.date,
                timeline: [...existing, { action: 'Closed (Back-Date)', by: byName, at: now, note: `Back-date close for ${params.date}. Engineer: ${params.engineerName}. Reason: ${params.reason}` }],
                updated_at: now,
            })
            .eq('id', ticket.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};