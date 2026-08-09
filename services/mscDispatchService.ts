import { supabase } from '@/lib/supabase';
import { MSCDispatch } from '@/types/mscDispatch';

export const fetchMSCDispatch = async (ticketId: string): Promise<MSCDispatch | null> => {
    try {
        const { data } = await supabase.from('auto_msc_dispatch').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false }).limit(1);
        return data && data[0] ? data[0] : null;
    } catch { return null; }
};

export const fetchMSCCenters = async (): Promise<{ name: string; city?: string }[]> => {
    try {
        const { data } = await supabase.from('auto_msc_centers').select('name, city').order('name');
        return data || [];
    } catch { return []; }
};

export const saveMSCDispatch = async (ticketId: string, params: { mscName: string; dispatchDate: string; courierName: string; docketNo: string }, dispatchedBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const existing = await fetchMSCDispatch(ticketId);
        const payload = {
            msc_name: params.mscName, dispatch_date: params.dispatchDate,
            courier_name: params.courierName, docket_no: params.docketNo,
            updated_at: new Date().toISOString(),
        };
        if (existing) {
            const { error } = await supabase.from('auto_msc_dispatch').update(payload).eq('ticket_id', ticketId);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('auto_msc_dispatch').insert([{ ...payload, ticket_id: ticketId, dispatched_by: dispatchedBy, created_at: new Date().toISOString() }]);
            if (error) throw error;
        }

        const { data: t } = await supabase.from('tickets').select('timeline').eq('id', ticketId).single();
        const tl = [...(t?.timeline || []), { action: 'MSC Dispatch Updated', by: dispatchedBy, at: new Date().toISOString(), note: `MSC: ${params.mscName} | Date: ${params.dispatchDate}${params.courierName ? ` | Courier: ${params.courierName}` : ''}${params.docketNo ? ` | Docket: ${params.docketNo}` : ' | Docket: Pending'}` }];
        await supabase.from('tickets').update({ timeline: tl, updated_at: new Date().toISOString() }).eq('id', ticketId);

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const markMSCReceived = async (ticketId: string, receivedDate: string, byName: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_msc_dispatch').update({ received_date: receivedDate, updated_at: new Date().toISOString() }).eq('ticket_id', ticketId);
        if (error) throw error;

        const { data: t } = await supabase.from('tickets').select('timeline').eq('id', ticketId).single();
        const tl = [...(t?.timeline || []), { action: 'Received from MSC', by: byName, at: new Date().toISOString(), note: `Received Date: ${receivedDate} — Ready for delivery` }];
        await supabase.from('tickets').update({ status: 'Pending for Delivery', timeline: tl, updated_at: new Date().toISOString() }).eq('id', ticketId);

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};