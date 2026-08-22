import { supabase } from '@/lib/supabase';
import { isTicketCancelled } from '@/types/ticketStatus';

const MYRPT_DONE_STATUSES = ['Closed', 'Delivered', 'Pending for Delivery', 'Repaired', 'Resolved By Phone', 'Customer Reject'];
const MYRPT_PENDING_STATUSES = ['Pending Parts', 'Pending Customer Approval', 'Pending Engineer Stock', 'Pending Spare', 'Hold', 'Pending Repair Carry In', 'Pending Repair On Site', 'Pending Allocation', 'Pending Customer Arrival'];
const COMPLETION_ACTIONS = ['Closed', 'Repaired', 'Pending for Delivery', 'Resolved By Phone'];

interface TlEntry { action?: string; at?: string; note?: string; }

const tlEntryDate = (e: TlEntry | null): string | null => {
    if (!e) return null;
    if (e.action?.includes('Back-Date') && e.note) {
        const m = String(e.note).match(/for\s+(\d{4}-\d{2}-\d{2})/);
        if (m) return m[1];
    }
    return e.at ? new Date(e.at).toLocaleDateString('en-CA') : null;
};

// Mirrors HTML's _engCompletionEntry(): the timeline entry marking when the
// engineer actually finished the repair — never a later Delivered/Invoice
// entry — falling back to a legacy 'Charges Set' entry.
const engCompletionEntry = (tl: TlEntry[]): TlEntry | null => {
    let last: TlEntry | null = null;
    tl.forEach(e => {
        if (!e?.action || !e?.at) return;
        if (e.action.includes('Delivered') || e.action.includes('Invoice')) return;
        if (COMPLETION_ACTIONS.some(c => e.action!.includes(c))) last = e;
    });
    if (!last) {
        tl.forEach(e => { if (e?.action?.includes('Charges Set') && e?.at) last = e; });
    }
    return last;
};

const engRejectEntry = (tl: TlEntry[]): TlEntry | null => {
    let last: TlEntry | null = null;
    tl.forEach(e => { if (e?.action?.includes('Reject') && e?.at) last = e; });
    return last;
};

const engClosedEntry = (tl: TlEntry[]): TlEntry | null => engCompletionEntry(tl) || engRejectEntry(tl);
const engClosedDate = (tl: TlEntry[]): string | null => tlEntryDate(engClosedEntry(tl));

const statusEventDate = (t: { status?: string; timeline?: TlEntry[] }): string | null => {
    const keyword = t.status;
    if (!keyword) return null;
    const tl = t.timeline || [];
    let lastMatch: TlEntry | null = null;
    tl.forEach(e => { if (e?.action?.includes(keyword) && e?.at) lastMatch = e; });
    if (!lastMatch && (keyword === 'Closed' || keyword === 'Resolved By Phone')) {
        tl.forEach(e => { if (e?.action?.includes('Charges Set') && e?.at) lastMatch = e; });
    }
    return lastMatch ? new Date((lastMatch as TlEntry).at!).toLocaleDateString('en-CA') : null;
};

interface EdrTicket {
    id: string;
    status?: string;
    call_type?: string;
    model?: string;
    timeline?: TlEntry[];
    assigned_to?: string;
    assigned_name?: string;
    payment_mode?: string;
    service_charges?: number;
    final_charges?: number;
    labor?: number;
    other_charge?: number;
    spares?: { qty?: number; price?: number }[];
}

const pcAmount = (t: EdrTicket): number => {
    const parts = (t.spares || []).reduce((a, s) => a + (s.qty || 0) * (s.price || 0), 0);
    const labor = Number(t.labor) || Number(t.service_charges) || 0;
    const other = Number(t.other_charge) || 0;
    const fin = Number(t.final_charges) || 0;
    return fin > 0 ? fin : (parts + labor + other);
};

export interface EdrClosedCall {
    id: string;
    date: string;
    time: string;
    sortKey: string;
    backdated: boolean;
    model: string;
    type: 'Warranty' | 'Non-Warranty';
    status?: string;
    call_type: string;
}

export interface EdrRow {
    id: string;
    name: string;
    w: number;
    ow: number;
    pending: number;
    paymentCollected: number;
    otherWork: number;
    total: number;
    list: EdrClosedCall[];
}

export const loadEngDailyReport = async (
    from: string, to: string, engFilter: string, allEngineers: { user_id: string; name: string }[]
): Promise<EdrRow[]> => {
    let tickets: any[] = [];
    let pageFrom = 0;
    const PAGE = 1000;
    while (true) {
        let q = supabase.from('tickets')
            .select('id, status, call_type, model, timeline, assigned_to, assigned_name, payment_mode, service_charges, final_charges, labor, other_charge, spares');
        q = engFilter ? q.eq('assigned_to', engFilter) : q.not('assigned_to', 'is', null);
        const { data: page, error } = await q.range(pageFrom, pageFrom + PAGE - 1);
        if (error) throw error;
        tickets = tickets.concat(page || []);
        if (!page || page.length < PAGE) break;
        pageFrom += PAGE;
    }

    const byEng: Record<string, EdrRow> = {};
    const ensure = (id: string, name?: string): EdrRow => {
        if (!byEng[id]) byEng[id] = { id, name: name || id, w: 0, ow: 0, pending: 0, paymentCollected: 0, otherWork: 0, total: 0, list: [] };
        return byEng[id];
    };

    (tickets || []).forEach((t: EdrTicket) => {
        if (!t.assigned_to) return;
        const tl = t.timeline || [];
        const isW = t.call_type === 'Warranty' || t.call_type === 'Warranty Repeat' || t.call_type === 'AMC';
        if (MYRPT_DONE_STATUSES.includes(t.status || '')) {
            const d = engClosedDate(tl);
            if (d && d >= from && d <= to) {
                const row = ensure(t.assigned_to, t.assigned_name);
                if (isW) row.w++; else row.ow++;
                if (t.payment_mode) row.paymentCollected += pcAmount(t);
                const ce = engClosedEntry(tl);
                const bd = !!(ce?.action?.includes('Back-Date'));
                const tm = (ce?.at && !bd) ? new Date(ce.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                const t24 = (ce?.at && !bd) ? new Date(ce.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '00:00';
                row.list.push({
                    id: t.id, date: d, time: tm, sortKey: `${d}T${t24}`, backdated: bd,
                    model: t.model || '', type: isW ? 'Warranty' : 'Non-Warranty', status: t.status, call_type: t.call_type || '',
                });
            }
        } else if (MYRPT_PENDING_STATUSES.includes(t.status || '')) {
            const d2 = statusEventDate(t);
            if (d2 && d2 >= from && d2 <= to) ensure(t.assigned_to, t.assigned_name).pending++;
        }
    });

    try {
        let ftq = supabase.from('field_tasks').select('assigned_to, assigned_name')
            .eq('status', 'Done').gte('done_date', from).lte('done_date', to);
        if (engFilter) ftq = ftq.eq('assigned_to', engFilter);
        const { data: fts } = await ftq;
        (fts || []).forEach((ft: any) => { if (ft.assigned_to) ensure(ft.assigned_to, ft.assigned_name).otherWork++; });
    } catch { /* field_tasks table optional — additive only */ }

    allEngineers.forEach(e => {
        if (engFilter && e.user_id !== engFilter) return;
        ensure(e.user_id, e.name);
    });

    const rows = Object.values(byEng).map(r => ({ ...r, total: r.w + r.ow }));
    rows.sort((a, b) => b.total - a.total);
    return rows;
};

// ─── Engineer's own Daily Report (self-submission) ───────────────────────────
// Mirrors HTML's openDailyReport()/drAutoFillCalls()/saveDailyReport()
// (index.html:13211-13811) — call-summary counts, pending backlog, petrol KM
// and remarks. The office-work/payment/review/site-visit sub-forms embedded
// in HTML's monolithic modal are intentionally not ported here: this app
// already has dedicated Field Tasks, Payment Collection and Site Visits
// screens for that data, so re-adding mini versions of them here would just
// duplicate data entry. office_work/payment_details/google_reviews/
// site_visits are still saved (as empty arrays) so the daily_reports row
// shape matches HTML's exactly.

const PENDING_PARTS_STATUSES = ['Pending Parts', 'Pending Engineer Stock', 'Pending Spare'];
const PENDING_APPROVAL_STATUSES = ['Pending Customer Approval'];
const PENDING_OTHER_STATUSES = ['Pending Repair Carry In', 'Pending Repair On Site', 'Pending Allocation', 'Pending Customer Arrival', 'Hold'];

export interface DrCallSummary {
    w_install: number; w_breakdown: number; w_repeat: number; w_resolved_phone: number;
    nw_breakdown: number; nw_repeat: number; nw_other: number; nw_delivery: number; nw_resolved_phone: number;
    warranty_total: number; nonwarranty_total: number; grand_total: number;
    pending_parts: number; pending_approval: number; pending_other: number; pending_calls: number;
    customer_reject: number;
}

export interface DailyReportRecord {
    id: number;
    eng_id: string;
    eng_name: string;
    report_date: string;
    call_summary: DrCallSummary;
    total_calls: number;
    pending_calls: number;
    petrol_km: number;
    remarks: string;
    total_amount: number;
}

const emptyCallSummary = (): DrCallSummary => ({
    w_install: 0, w_breakdown: 0, w_repeat: 0, w_resolved_phone: 0,
    nw_breakdown: 0, nw_repeat: 0, nw_other: 0, nw_delivery: 0, nw_resolved_phone: 0,
    warranty_total: 0, nonwarranty_total: 0, grand_total: 0,
    pending_parts: 0, pending_approval: 0, pending_other: 0, pending_calls: 0, customer_reject: 0,
});

// Mirrors HTML's drAutoFillCalls() call-type bucketing + pending backlog +
// odometer-based petrol KM auto-fill (the GPS-track fallback is not ported).
export const fetchDailyReportAutofill = async (engId: string, date: string): Promise<{ callSummary: DrCallSummary; petrolKm: number }> => {
    const cs = emptyCallSummary();
    try {
        const { data: tickets } = await supabase.from('tickets')
            .select('call_type, problem, status, timeline')
            .eq('assigned_to', engId).gte('updated_at', `${date}T00:00:00`).limit(2000);
        (tickets || []).forEach((t: any) => {
            if (isTicketCancelled(t.status)) return;
            const tl: TlEntry[] = t.timeline || [];
            if (tlEntryDate(engCompletionEntry(tl)) !== date) return;
            const ct = t.call_type || '';
            const prob = (t.problem || '').toLowerCase();
            if (t.status === 'Resolved By Phone') {
                if (ct === 'Warranty' || ct === 'Warranty Repeat') cs.w_resolved_phone++; else cs.nw_resolved_phone++;
                return;
            }
            if (ct === 'Warranty') {
                if (prob.includes('install') || prob.includes('new set')) cs.w_install++; else cs.w_breakdown++;
            } else if (ct === 'Warranty Repeat') {
                cs.w_repeat++;
            } else if (ct === 'Non-Warranty') {
                if (prob.includes('deliver') || prob.includes('cart') || prob.includes('ink')) cs.nw_delivery++; else cs.nw_breakdown++;
            } else if (ct === 'Non-Warranty Repeat') {
                cs.nw_repeat++;
            } else {
                cs.nw_other++;
            }
        });

        const { data: pendingTickets } = await supabase.from('tickets').select('status')
            .eq('assigned_to', engId).in('status', [...PENDING_PARTS_STATUSES, ...PENDING_APPROVAL_STATUSES, ...PENDING_OTHER_STATUSES]);
        cs.pending_parts = (pendingTickets || []).filter((t: any) => PENDING_PARTS_STATUSES.includes(t.status)).length;
        cs.pending_approval = (pendingTickets || []).filter((t: any) => PENDING_APPROVAL_STATUSES.includes(t.status)).length;
        cs.pending_other = (pendingTickets || []).filter((t: any) => PENDING_OTHER_STATUSES.includes(t.status)).length;

        const { data: rejectTickets } = await supabase.from('tickets').select('status, timeline')
            .eq('assigned_to', engId).eq('status', 'Customer Reject');
        cs.customer_reject = (rejectTickets || []).filter((t: any) => tlEntryDate(engRejectEntry(t.timeline || [])) === date).length;
    } catch (err) { console.error('fetchDailyReportAutofill:', err); }

    cs.warranty_total = cs.w_install + cs.w_breakdown + cs.w_repeat + cs.w_resolved_phone;
    cs.nonwarranty_total = cs.nw_breakdown + cs.nw_repeat + cs.nw_other + cs.nw_delivery + cs.nw_resolved_phone;
    cs.grand_total = cs.warranty_total + cs.nonwarranty_total;
    cs.pending_calls = cs.pending_parts + cs.pending_approval + cs.pending_other;

    let petrolKm = 0;
    try {
        const { data: kmLogs } = await supabase.from('km_logs').select('entry_type, odometer_km')
            .eq('eng_id', engId).eq('log_date', date).order('captured_at', { ascending: true });
        if (kmLogs && kmLogs.length) {
            let opening: number | null = null, maxRead: number | null = null;
            kmLogs.forEach((l: any) => {
                const n = parseFloat(l.odometer_km);
                if (isNaN(n)) return;
                if (l.entry_type === 'opening' && opening === null) opening = n;
                if (maxRead === null || n > maxRead) maxRead = n;
            });
            if (opening === null) { const first = parseFloat(kmLogs[0].odometer_km); if (!isNaN(first)) opening = first; }
            if (opening !== null && maxRead !== null && maxRead >= opening) petrolKm = Math.round((maxRead - opening) * 10) / 10;
        }
    } catch { /* odometer KM covers the common case — GPS fallback not ported */ }

    return { callSummary: cs, petrolKm };
};

export const saveDailyReportSelf = async (params: {
    engId: string; engName: string; date: string; callSummary: DrCallSummary; petrolKm: number; remarks: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const cs = params.callSummary;
        const { error } = await supabase.from('daily_reports').insert([{
            eng_id: params.engId, eng_name: params.engName, report_date: params.date,
            site_visits: [], total_site_visits: cs.grand_total,
            warranty_installation: cs.w_install || 0,
            warranty_breakdown: (cs.w_breakdown || 0) + (cs.w_repeat || 0),
            outwarranty_breakdown: (cs.nw_breakdown || 0) + (cs.nw_repeat || 0),
            outwarranty_other: (cs.nw_other || 0) + (cs.nw_delivery || 0),
            total_calls: cs.grand_total || 0,
            pending_calls: cs.pending_calls || 0,
            call_summary: cs,
            office_work: [], total_office_work: 0,
            payment_details: [], total_amount: 0,
            petrol_km: params.petrolKm,
            google_reviews: [], total_reviews: 0,
            remarks: params.remarks,
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

// Mirrors HTML's startPunchOutDailyReport() auto-skip check: has today's
// Daily Report already been submitted?
export const hasDailyReportToday = async (engId: string, date: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.from('daily_reports').select('id')
            .eq('eng_id', engId).eq('report_date', date).limit(1);
        if (error) throw error;
        return !!(data && data.length);
    } catch (err) { console.error('hasDailyReportToday:', err); return false; }
};

// Mirrors HTML's openPastReports(): last 30 reports for this engineer.
export const fetchPastDailyReports = async (engId: string): Promise<DailyReportRecord[]> => {
    try {
        const { data, error } = await supabase.from('daily_reports').select('*')
            .eq('eng_id', engId).order('report_date', { ascending: false }).limit(30);
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchPastDailyReports:', err); return []; }
};

// On-demand Telegram + Email digest — same edge function the 8PM cron uses.
export const sendDigestNow = async (): Promise<{ success: boolean; error?: string; engineers?: number; telegramOk?: boolean; emailOk?: boolean }> => {
    try {
        const { data, error } = await supabase.functions.invoke('daily-digest', { body: {} });
        if (error) throw error;
        const tgOk = Array.isArray(data?.results?.telegram) ? data.results.telegram.some((s: string) => String(s).includes('sent')) : false;
        const emOk = String(data?.results?.email || '').includes('sent');
        return { success: !!data?.ok, engineers: data?.engineers || 0, telegramOk: tgOk, emailOk: emOk };
    } catch (err) { return { success: false, error: (err as any).message }; }
};