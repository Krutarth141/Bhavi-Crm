import { supabase } from '@/lib/supabase';
import { PaymentTicket, PcBreakdown } from '@/types/paymentCollection';

export const fetchPaymentCollectionTickets = async (myId: string, canManage: boolean): Promise<PaymentTicket[]> => {
    try {
        let q = supabase.from('tickets')
            .select('id, cname, mobile, area, model, payment_mode, service_charges, final_charges, labor, other_charge, spares, updated_at, assigned_to, assigned_name, payment_received, payment_received_at, payment_received_by, invoice_done, invoice_no')
            .not('payment_mode', 'is', null)
            .order('updated_at', { ascending: false });
        if (!canManage) q = q.eq('assigned_to', myId);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchPaymentCollectionTickets:', err); return []; }
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

export const markPaymentReceived = async (
    ticketId: string, received: boolean, receivedBy: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const patch = received
            ? { payment_received: true, payment_received_at: new Date().toISOString(), payment_received_by: receivedBy }
            : { payment_received: false, payment_received_at: null, payment_received_by: null };
        const { error } = await supabase.from('tickets').update(patch).eq('id', ticketId);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
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