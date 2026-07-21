import { supabase } from '@/lib/supabase';
import { AutoSite, AutoSiteItem, AutoSiteVisit, AutoSitePayment, SiteFormData, SiteItemForm, PaymentForm } from '@/types/autoSites';

export const fetchSites = async (): Promise<AutoSite[]> => {
    try {
        const { data, error } = await supabase.from('auto_sites').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSites:', err); return []; }
};

export const createSite = async (form: SiteFormData, createdBy: string): Promise<{ success: boolean; id?: number; error?: string }> => {
    try {
        const { data, error } = await supabase.from('auto_sites').insert([{
            site_name: form.site_name.trim(),
            client_name: form.client_name.trim(),
            mobile: form.mobile.trim() || null,
            address: form.address.trim() || null,
            created_by: createdBy,
        }]).select().single();
        if (error) throw error;
        return { success: true, id: data.id };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const deleteSite = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_sites').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const fetchSiteItems = async (siteId: number): Promise<AutoSiteItem[]> => {
    try {
        const { data, error } = await supabase.from('auto_site_items').select('*').eq('site_id', siteId).order('created_at');
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSiteItems:', err); return []; }
};

export const fetchSiteVisits = async (siteId: number): Promise<AutoSiteVisit[]> => {
    try {
        const { data, error } = await supabase.from('auto_site_visits').select('*').eq('site_id', siteId).order('visit_date', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSiteVisits:', err); return []; }
};

export const addSiteVisit = async (siteId: number, visitData: Partial<AutoSiteVisit>): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_site_visits').insert([{ site_id: siteId, ...visitData }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const addSiteItem = async (siteId: number, form: SiteItemForm): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_site_items').insert([{
            site_id: siteId, item_name: form.item_name.trim(), qty: Number(form.qty) || 1,
            unit: form.unit || 'pcs', purchase_price: Number(form.purchase_price) || 0,
            unit_price: Number(form.unit_price) || 0, gst_percent: Number(form.gst_percent) || 0,
            note: form.note.trim() || null,
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const updateSiteItem = async (id: number, form: SiteItemForm): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_site_items').update({
            item_name: form.item_name.trim(), qty: Number(form.qty) || 1, unit: form.unit || 'pcs',
            purchase_price: Number(form.purchase_price) || 0, unit_price: Number(form.unit_price) || 0,
            gst_percent: Number(form.gst_percent) || 0, note: form.note.trim() || null,
        }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const deleteSiteItem = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_site_items').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const markItemDelivered = async (id: number, params: { deliveredQty: number; date: string; via: string; by: string; note: string; totalQty: number }): Promise<{ success: boolean; error?: string }> => {
    try {
        const status = params.deliveredQty >= params.totalQty ? 'delivered' : params.deliveredQty > 0 ? 'partial' : 'pending';
        const { error } = await supabase.from('auto_site_items').update({
            delivery_status: status, delivered_qty: params.deliveredQty, delivered_date: params.date || null,
            delivered_by: params.via + (params.by ? ` — ${params.by}` : ''), delivery_note: params.note || null,
        }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const fetchSitePayments = async (siteId: number): Promise<AutoSitePayment[]> => {
    try {
        const { data, error } = await supabase.from('auto_site_payments').select('*').eq('site_id', siteId).order('payment_date', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSitePayments:', err); return []; }
};

export const addSitePayment = async (siteId: number, form: PaymentForm, createdBy: string): Promise<{ success: boolean; id?: number; error?: string }> => {
    try {
        const { data, error } = await supabase.from('auto_site_payments').insert([{
            site_id: siteId, amount: Number(form.amount) || 0, payment_mode: form.payment_mode,
            payment_date: form.payment_date, reference_no: form.reference_no.trim() || null,
            note: form.note.trim() || null, created_by: createdBy,
        }]).select().single();
        if (error) throw error;
        return { success: true, id: data.id };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const deleteSitePayment = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('auto_site_payments').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const fetchAllSitePaymentSums = async (): Promise<Record<number, number>> => {
    try {
        const { data, error } = await supabase.from('auto_site_payments').select('site_id, amount');
        if (error) throw error;
        const map: Record<number, number> = {};
        (data || []).forEach((p: any) => { map[p.site_id] = (map[p.site_id] || 0) + (parseFloat(p.amount) || 0); });
        return map;
    } catch (err) { console.error('fetchAllSitePaymentSums:', err); return {}; }
};

export const fetchAllSiteItemAggregates = async (): Promise<Record<number, { total: number; delivered: number; value: number }>> => {
    try {
        const { data, error } = await supabase.from('auto_site_items').select('site_id, unit_price, qty, gst_percent, delivery_status');
        if (error) throw error;
        const map: Record<number, { total: number; delivered: number; value: number }> = {};
        (data || []).forEach((i: any) => {
            if (!map[i.site_id]) map[i.site_id] = { total: 0, delivered: 0, value: 0 };
            map[i.site_id].total++;
            if (i.delivery_status === 'delivered') map[i.site_id].delivered++;
            map[i.site_id].value += Math.round((i.unit_price || 0) * (i.qty || 0) * (1 + (i.gst_percent || 0) / 100));
        });
        return map;
    } catch (err) { console.error('fetchAllSiteItemAggregates:', err); return {}; }
};