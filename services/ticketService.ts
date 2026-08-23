import { supabase } from '@/lib/supabase';
import { Ticket } from '@/types/tickets';
import { isTicketActive } from '@/types/ticketStatus';
import { notifyNewTicket, notifyStatusChange } from './telegramNotify';
import { notifyReportEditSubmitted, notifyReportEditResult } from './brightActionService';

export const fetchAllTickets = async (): Promise<Ticket[]> => {
    try {
        let all: Ticket[] = [];
        let from = 0;
        const PAGE = 1000;
        while (true) {
            const { data, error } = await supabase
                .from('tickets')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, from + PAGE - 1);
            if (error) throw error;
            all = all.concat(data || []);
            if (!data || data.length < PAGE) break;
            from += PAGE;
        }
        return all;
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

// Mirrors HTML's generateTicketNo() (index.html:5778-5795).
// Format: BEA-YYYYMMDD-NNNN (e.g. BEA-20260816-0001), same date convention as
// the Canon SE Call ID (CSP/YYYYMMDD/NNNNN). The trailing NNNN is ONE
// continuous counter across the WHOLE ticket table, deliberately NOT reset per
// day/year — a per-period reset is exactly what produced two different tickets
// on different dates both ending "-0010". So the max scan below covers every
// BEA-* id ever created, across every id format this table has used
// (BEA-YYYY-NNN, BEA-YYYYMM-NNNN, BEA-YYYYMMDD-NNNN), and returns max + 1.
export const generateTicketNo = async (): Promise<string> => {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    let max = 0;
    let from = 0;
    const PAGE = 1000;
    while (true) {
        const { data, error } = await supabase.from('tickets').select('id')
            .like('id', 'BEA-%').range(from, from + PAGE - 1);
        if (error) throw error;
        (data || []).forEach((r: any) => {
            const n = parseInt(String(r.id).split('-').pop() || '', 10);
            if (!isNaN(n) && n > max) max = n;
        });
        if (!data || data.length < PAGE) break;
        from += PAGE;
    }
    return `BEA-${ymd}-${String(max + 1).padStart(4, '0')}`;
};

const isDuplicateKeyError = (msg: string) =>
    msg.includes('23505') || msg.toLowerCase().includes('duplicate key') || msg.includes('tickets_pkey');

export const createTicket = async (ticketData: Partial<Ticket>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        let newId = await generateTicketNo();

        // Auto-set status: if engineer assigned, status is "Assigned", otherwise "Pending Allocation"
        const dataToInsert: any = {
            ...ticketData,
            id: newId,
            job_sheet: newId,
            status: ticketData.assigned_to ? 'Assigned' : (ticketData.status || 'Pending Allocation'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // Collision-safe insert: if another device/tab just took the generated
        // number (duplicate primary key, PG 23505), fetch the next free number
        // and retry — a same-day call must never be blocked by a numbering
        // clash (index.html:5738-5754).
        let posted = false;
        let lastErr: any = null;
        for (let attempt = 0; attempt < 5 && !posted; attempt++) {
            const { error } = await supabase.from('tickets').insert([dataToInsert]);
            if (!error) { posted = true; break; }
            const msg = String(error.message || error);
            if (!isDuplicateKeyError(msg)) throw error;
            lastErr = error;
            newId = await generateTicketNo();
            dataToInsert.id = newId;
            dataToInsert.job_sheet = newId;
        }
        if (!posted) throw (lastErr || new Error('Could not create ticket — please retry.'));

        // Customer master record, so the next call's customer search finds them
        // (index.html:5758). Best-effort — the ticket is what matters. `serial`
        // is this table's key, so an upsert keeps repeat calls on the same
        // device from erroring out on a duplicate key.
        if (dataToInsert.serial) {
            try {
                await supabase.from('customers').upsert([{
                    serial: dataToInsert.serial,
                    model: dataToInsert.model || '',
                    cname: dataToInsert.cname || '',
                    mobile: dataToInsert.mobile || '',
                    alt_mobile: dataToInsert.alt_mobile || '',
                    address: dataToInsert.address || '',
                    city: dataToInsert.city || '',
                    pin: dataToInsert.pin || '',
                    state: dataToInsert.state || '',
                    area: dataToInsert.area || '',
                    updated_at: new Date().toISOString(),
                }], { onConflict: 'serial' });
            } catch { /* customer master is additive only */ }
        }

        notifyNewTicket({ ...dataToInsert, id: newId });
        return { success: true, id: newId };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Blocks a second ACTIVE call on the same device (index.html:5715-5730). Every
// closed status (Resolved By Phone, Repaired, Pending for Delivery, Customer
// Reject, …) counts as done via isTicketActive, so only a genuinely open call
// blocks. Auto-generated "NO-SN-…" placeholders are exempt — they are not real
// serials and would collide with each other.
export const findOpenCallsForSerial = async (
    serial: string
): Promise<{ id: string; status: string; cname?: string }[]> => {
    if (!serial || serial.startsWith('NO-SN-')) return [];
    try {
        const { data } = await supabase.from('tickets').select('id, status, cname')
            .eq('serial', serial).order('created_at', { ascending: false }).limit(10);
        return (data || []).filter((t: any) => isTicketActive(t.status));
    } catch { return []; }
};

export const ensureGroupId = async (ticket: Ticket): Promise<{ success: boolean; groupId?: string; error?: string }> => {
    if (ticket.group_id) return { success: true, groupId: ticket.group_id };
    try {
        const { error } = await supabase.from('tickets').update({ group_id: ticket.id }).eq('id', ticket.id);
        if (error) throw error;
        return { success: true, groupId: ticket.id };
    } catch (err) {
        const msg = (err as any)?.message || String(err);
        if (msg.indexOf('group_id') !== -1) {
            return { success: false, error: 'Setup needed: add a "group_id" (text) column to the tickets table, then try again.' };
        }
        return { success: false, error: msg };
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

        if (finalUpdates.status) {
            supabase.from('tickets').select('id,cname,model').eq('id', ticketId).single().then(({ data }) => {
                if (data) notifyStatusChange(data, finalUpdates.status!);
            });
        }

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

export const closeTicket = async (ticketId: string, finalRemarks?: string, byUser?: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data: existing } = await supabase.from('tickets').select('timeline').eq('id', ticketId).single();

        const updates: any = {
            status: 'Closed',
            updated_at: new Date().toISOString(),
            last_status_by: byUser || '',
            // My Report / Engineer Daily Report derive a call's closed-date
            // exclusively from timeline entries — without this, a ticket closed
            // via this quick action would silently vanish from both reports.
            timeline: [...(existing?.timeline || []), {
                action: 'Status → Closed',
                by: byUser || '',
                at: new Date().toISOString(),
                note: finalRemarks || undefined,
            }],
        };

        if (finalRemarks) {
            updates.remarks = finalRemarks;
        }

        const { error } = await supabase
            .from('tickets')
            .update(updates)
            .eq('id', ticketId);

        if (error) throw error;

        supabase.from('tickets').select('id,cname,model').eq('id', ticketId).single().then(({ data }) => {
            if (data) notifyStatusChange(data, 'Closed');
        });

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
        notifyReportEditSubmitted(String(ticket.id), ticket.cname, ticket.model, '', pending_edit);
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
        notifyReportEditResult(String(ticket.id), 'approved', ticket.cname, ticket.model, pe.wc_id, pe);
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
        notifyReportEditResult(String(ticket.id), 'rejected', ticket.cname, ticket.model, pe.wc_id, pe, reason);
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

export const saveTAT = async (ticketId: string, tatIso: string | null, canonReceivedIso: string | null, byName: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data: t } = await supabase.from('tickets').select('timeline').eq('id', ticketId).single();
        const tatDisplay = tatIso ? new Date(tatIso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '';
        const recvNote = canonReceivedIso ? ` | Canon received: ${new Date(canonReceivedIso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}` : '';
        const note = tatIso ? `TAT deadline: ${tatDisplay}${recvNote}` : 'TAT cleared';
        const tl = [...(t?.timeline || []), { action: 'TAT Updated', by: byName, at: new Date().toISOString(), note }];
        const { error } = await supabase.from('tickets').update({ tat_date: tatIso, timeline: tl, updated_at: new Date().toISOString() }).eq('id', ticketId);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const saveSignature = async (ticketId: string, dataUrl: string, byName: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data: t } = await supabase.from('tickets').select('timeline').eq('id', ticketId).single();
        const tl = [...(t?.timeline || []), { action: 'Customer Signed', by: byName, at: new Date().toISOString() }];
        const { error } = await supabase.from('tickets').update({ customer_signature: dataUrl, timeline: tl, updated_at: new Date().toISOString() }).eq('id', ticketId);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};