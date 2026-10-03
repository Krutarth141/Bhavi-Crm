import { supabase } from '@/lib/supabase';
import { PaymentTicket, PcBreakdown } from '@/types/paymentCollection';

const PC_FULL_SELECT = 'id, cname, mobile, area, model, payment_mode, service_charges, final_charges, labor, other_charge, spares, updated_at, assigned_to, assigned_name, payment_received, payment_received_at, payment_received_by, payment_collected_by, payment_collected_by_id, invoice_done, invoice_no';
const PC_FALLBACK_SELECT = 'id, cname, mobile, area, model, payment_mode, service_charges, final_charges, labor, other_charge, spares, updated_at, assigned_to, assigned_name, payment_received, payment_received_at, payment_received_by, invoice_done, invoice_no';

// Matches HTML's renderPaymentCollection() catch block (index.html:9899-9910):
// - error mentions payment_collected_by(_id) → those columns aren't added
//   yet, retry without them so the page still works (old assigned_to-only
//   visibility for non-managers).
// - error mentions payment_received → setup-needed banner.
// - anything else → surfaced as a real error, not a silent empty list.
export const fetchPaymentCollectionTickets = async (
    myId: string, canManage: boolean
): Promise<{ tickets: PaymentTicket[]; setupNeeded: boolean; error?: string }> => {
    try {
        let q = supabase.from('tickets')
            .select(PC_FULL_SELECT)
            .not('payment_mode', 'is', null)
            .order('updated_at', { ascending: false });
        if (!canManage) q = q.or(`assigned_to.eq.${myId},payment_collected_by_id.eq.${myId}`);
        const { data, error } = await q;
        if (error) throw error;
        const tickets = data || [];
        await mergeFieldTaskPayments(tickets, myId, canManage);
        return { tickets, setupNeeded: false };
    } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.indexOf('payment_collected_by') !== -1) {
            try {
                let q2 = supabase.from('tickets')
                    .select(PC_FALLBACK_SELECT)
                    .not('payment_mode', 'is', null)
                    .order('updated_at', { ascending: false });
                if (!canManage) q2 = q2.eq('assigned_to', myId);
                const { data, error: err2 } = await q2;
                if (err2) throw err2;
                const tickets = data || [];
                await mergeFieldTaskPayments(tickets, myId, canManage);
                return { tickets, setupNeeded: false };
            } catch (err2: any) {
                console.error('fetchPaymentCollectionTickets (fallback):', err2);
                return { tickets: [], setupNeeded: false, error: String(err2?.message || 'Unknown error') };
            }
        }
        if (msg.indexOf('payment_received') !== -1) {
            return { tickets: [], setupNeeded: true };
        }
        console.error('fetchPaymentCollectionTickets:', err);
        return { tickets: [], setupNeeded: false, error: msg || 'Unknown error' };
    }
};

// index.html:11784-11800 — "Other Work" (field_tasks) that collected payment
// in the field is exactly like a Non-Warranty call's Delivered handover: real
// money needing the same Pending/Received tracking. Best-effort (mirrors
// HTML's own `.catch(()=>[])`) — never fails the main ticket list.
const mergeFieldTaskPayments = async (tickets: PaymentTicket[], myId: string, canManage: boolean): Promise<void> => {
    try {
        let q = supabase.from('field_tasks')
            .select('id, customer_name, mobile, task_type, amount, payment_mode, payment_splits, payment_received, payment_received_at, payment_received_by, payment_collected_by, payment_collected_by_id, assigned_to, assigned_name, updated_at')
            .not('payment_mode', 'is', null)
            .order('updated_at', { ascending: false });
        if (!canManage) q = q.or(`assigned_to.eq.${myId},payment_collected_by_id.eq.${myId}`);
        const { data } = await q;
        (data || []).forEach((ft: any) => {
            tickets.push({
                id: `FT-${ft.id}`, _isFt: true, _ftRealId: ft.id,
                cname: ft.customer_name, mobile: ft.mobile, area: '-', model: `🚚 ${ft.task_type || 'Other Work'}`,
                final_charges: ft.amount || 0, spares: [], labor: 0, other_charge: 0,
                payment_mode: ft.payment_mode, payment_splits: ft.payment_splits,
                payment_received: ft.payment_received, payment_received_at: ft.payment_received_at, payment_received_by: ft.payment_received_by,
                payment_collected_by: ft.payment_collected_by, payment_collected_by_id: ft.payment_collected_by_id,
                assigned_to: ft.assigned_to, assigned_name: ft.assigned_name, updated_at: ft.updated_at,
            });
        });
    } catch { /* best-effort, matches HTML's silent catch here */ }
};

// Same fallback chain as HTML's _pcBreakdown(): final_charges wins when set,
// otherwise rebuild from parts + labor/service_charges + other.
export const pcBreakdown = (t: PaymentTicket): PcBreakdown => {
    const parts = (t.spares || []).reduce((a, s) => a + (s.qty || 0) * (s.price || 0), 0);
    const labor = Number(t.labor) || Number(t.service_charges) || 0;
    const other = Number(t.other_charge) || 0;
    const fin = Number(t.final_charges) || 0;
    return { parts, labor, other, total: fin > 0 ? fin : (parts + labor + other) };
};

export const pcAmount = (t: PaymentTicket): number => pcBreakdown(t).total;

// index.html:11915-11917 — an _isFt row PATCHes field_tasks by its real id,
// not the tickets table (t.id there is the synthetic 'FT-<id>' label).
export const markPaymentReceived = async (
    ticketId: string, received: boolean, receivedBy: string, ftRealId?: number
): Promise<{ success: boolean; error?: string; setupNeeded?: boolean }> => {
    try {
        const patch = received
            ? { payment_received: true, payment_received_at: new Date().toISOString(), payment_received_by: receivedBy }
            : { payment_received: false, payment_received_at: null, payment_received_by: null };
        const { error } = ftRealId != null
            ? await supabase.from('field_tasks').update(patch).eq('id', ftRealId)
            : await supabase.from('tickets').update(patch).eq('id', ticketId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        const message = err?.message || '';
        return { success: false, error: message, setupNeeded: String(message).indexOf('payment_received') !== -1 };
    }
};

export const savePaymentInvoice = async (
    ticketId: string, invoiceNo: string, byUser: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data: fresh } = await supabase.from('tickets').select('timeline').eq('id', ticketId).maybeSingle();
        let tl = fresh?.timeline || [];
        if (typeof tl === 'string') { try { tl = JSON.parse(tl); } catch { tl = []; } }
        tl = [...tl, { action: 'Invoice Done', by: byUser, at: new Date().toISOString(), note: `Invoice No: ${invoiceNo}` }];
        const { error } = await supabase.from('tickets').update({
            invoice_done: true, invoice_no: invoiceNo, timeline: tl, updated_at: new Date().toISOString(),
        }).eq('id', ticketId);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};