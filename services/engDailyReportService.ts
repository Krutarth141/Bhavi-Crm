import { supabase } from '@/lib/supabase';

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
    let from = 0;
    const PAGE = 1000;
    while (true) {
        let q = supabase.from('tickets')
            .select('id, status, call_type, model, timeline, assigned_to, assigned_name, payment_mode, service_charges, final_charges, labor, other_charge, spares');
        q = engFilter ? q.eq('assigned_to', engFilter) : q.not('assigned_to', 'is', null);
        const { data: page, error } = await q.range(from, from + PAGE - 1);
        if (error) throw error;
        tickets = tickets.concat(page || []);
        if (!page || page.length < PAGE) break;
        from += PAGE;
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