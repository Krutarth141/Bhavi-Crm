import { supabase } from '@/lib/supabase';
import { isTicketCancelled } from '@/types/ticketStatus';
import { saveWorkLog } from './myCallsService';

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
// (index.html:14032-14098, 14521-14612) — call-summary counts, pending
// backlog, the ENG002-only automation site-visit count, Office Work rows
// (manual + today's already-logged Other Work shown read-only), Payment
// rows, Google Review rows, petrol KM and remarks. `site_visits` (the legacy
// top-level array, distinct from `auto_site_visits` on DrCallSummary above)
// is still saved as `[]` — HTML never populates it from this form either.

const PENDING_PARTS_STATUSES = ['Pending Parts', 'Pending Engineer Stock', 'Pending Spare'];
const PENDING_APPROVAL_STATUSES = ['Pending Customer Approval'];
const PENDING_OTHER_STATUSES = ['Pending Repair Carry In', 'Pending Repair On Site', 'Pending Allocation', 'Pending Customer Arrival', 'Hold'];

export interface DrCallSummary {
    w_install: number; w_breakdown: number; w_repeat: number; w_resolved_phone: number;
    nw_breakdown: number; nw_repeat: number; nw_other: number; nw_delivery: number; nw_resolved_phone: number;
    warranty_total: number; nonwarranty_total: number; grand_total: number;
    pending_parts: number; pending_approval: number; pending_other: number; pending_calls: number;
    customer_reject: number;
    // Automation site visits (ENG002 only). Deliberately NOT named site_visits/
    // total_site_visits — those are pre-existing top-level report fields used
    // for something else and kept for backward compat (index.html:14548-14551).
    auto_site_visits: number;
}

// One manually-entered Office Work row (index.html:14257 addOfficeWorkRow).
export interface DrOfficeWork { work_type: string; remark: string; from_time: string; to_time: string }

// One Office Work item already logged live today via the Other Work page —
// shown read-only and deliberately NOT folded into office_work, because the
// daily digest already reads field_tasks independently and would double-count
// it (index.html:14290-14299 + drAutoFillOfficeWork).
export interface DrAutoOfficeWork { id: string; customer_name: string; notes: string; from_time: string; to_time: string }

export interface DrPayment { customer: string; amount: number; mode: string }
export interface DrGoogleReview { customer: string; stars: number }

export const DR_OFFICE_WORK_TYPES = [
    'Remote Support', 'Configuration', 'Estimation', 'Documentation',
    'Follow-up Call', 'Billing / Invoice', 'Stock / Inventory', 'Training', 'Other',
];

// Payment modes MUST match tickets.payment_mode exactly (set at call-close in
// the Payment Confirmation popup) or the Daily Report shows the wrong mode
// (index.html:14330-14338).
export const DR_PAYMENT_MODES = [
    { value: 'Cash', label: '💵 Cash' },
    { value: 'Online', label: '📱 Online' },
    { value: 'Check', label: '🏦 Cheque' },
    { value: 'Card', label: '💳 Card' },
];

// Today's Office Work already logged live via the Other Work page
// (index.html:14235 drAutoFillOfficeWork).
export const fetchDrAutoOfficeWork = async (engId: string, date: string): Promise<DrAutoOfficeWork[]> => {
    try {
        const { data } = await supabase.from('field_tasks')
            .select('id, customer_name, notes, from_time, to_time, done_at')
            .eq('assigned_to', engId).eq('task_type', 'Office Work').eq('status', 'Done').eq('done_date', date)
            .order('done_at', { ascending: true });
        return (data || []).map((t: any) => ({
            id: String(t.id), customer_name: t.customer_name || 'Work', notes: t.notes || '',
            from_time: t.from_time || '', to_time: t.to_time || '',
        }));
    } catch (err) { console.error('fetchDrAutoOfficeWork:', err); return []; }
};

// Completed automation site visits for the day — ENG002 only
// (index.html:14511 drAutoFillSiteVisits).
export const fetchDrAutoSiteVisitCount = async (engId: string, date: string): Promise<number> => {
    try {
        const { data } = await supabase.from('auto_site_visits').select('id')
            .eq('created_by', engId).eq('visit_date', date).eq('visit_status', 'completed');
        return (data || []).length;
    } catch (err) { console.error('fetchDrAutoSiteVisitCount:', err); return 0; }
};

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
    // fetchPastDailyReports() selects *, so these come back too — they are what
    // the share message needs to cover Office Work / Payments / Reviews.
    office_work?: DrOfficeWork[] | string | null;
    payment_details?: DrPayment[] | string | null;
    google_reviews?: DrGoogleReview[] | string | null;
}

// ─── WhatsApp share text (index.html:14646 formatDailyReportWA) ──────────────
// Kept verbatim in structure so a report shared from the port reads identically
// to one shared from the legacy app. Used both right after a report is
// submitted and from the Past Reports list.
export interface DailyReportWAInput {
    eng_name: string;
    report_date: string;
    call_summary?: DrCallSummary | null;
    office_work?: DrOfficeWork[] | string | null;
    payments?: DrPayment[] | string | null;
    total_amount?: number;
    petrol_km?: number;
    google_reviews?: DrGoogleReview[] | string | null;
    remarks?: string;
}

export const waArr = <T,>(v: T[] | string | null | undefined): T[] => {
    if (!v) return [];
    if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
    return Array.isArray(v) ? v : [];
};

export const formatDailyReportWA = (d: DailyReportWAInput): string => {
    const DIV = '━━━━━━━━━━━━━━━━━━━━━';
    const RULE = '▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔';
    const lines: string[] = [];
    const dateStr = d.report_date
        ? new Date(d.report_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : d.report_date;
    const cs = (d.call_summary || {}) as Partial<DrCallSummary>;
    const ow = waArr<DrOfficeWork>(d.office_work);
    const pm = waArr<DrPayment>(d.payments);
    const gr = waArr<DrGoogleReview>(d.google_reviews);

    lines.push(DIV, '📋 *DAILY REPORT*', DIV, `👷 *${d.eng_name}*`, `📅 ${dateStr}`, '');

    const wTotal = cs.warranty_total || ((cs.w_install || 0) + (cs.w_breakdown || 0) + (cs.w_repeat || 0) + (cs.w_resolved_phone || 0));
    const nwTotal = cs.nonwarranty_total || ((cs.nw_breakdown || 0) + (cs.nw_repeat || 0) + (cs.nw_other || 0) + (cs.nw_delivery || 0) + (cs.nw_resolved_phone || 0));
    const grandTotal = cs.grand_total || (wTotal + nwTotal) || 0;
    if (grandTotal > 0) {
        lines.push(`📊 *CALL SUMMARY*  (Total: ${grandTotal})`, RULE);
        lines.push(`  🔵 *WARRANTY*  (${wTotal})`);
        if ((cs.w_install || 0) > 0) lines.push(`     • Installation: ${cs.w_install}`);
        if ((cs.w_breakdown || 0) > 0) lines.push(`     • Breakdown: ${cs.w_breakdown}`);
        if ((cs.w_repeat || 0) > 0) lines.push(`     • Repeat: ${cs.w_repeat}`);
        if ((cs.w_resolved_phone || 0) > 0) lines.push(`     • 📞 Resolved By Phone: ${cs.w_resolved_phone}`);
        lines.push('');
        lines.push(`  🔴 *NON-WARRANTY*  (${nwTotal})`);
        if ((cs.nw_breakdown || 0) > 0) lines.push(`     • Breakdown: ${cs.nw_breakdown}`);
        if ((cs.nw_repeat || 0) > 0) lines.push(`     • Repeat: ${cs.nw_repeat}`);
        if ((cs.nw_other || 0) > 0) lines.push(`     • Other / AMC: ${cs.nw_other}`);
        if ((cs.nw_delivery || 0) > 0) lines.push(`     • Cart/Ink Delivery: ${cs.nw_delivery}`);
        if ((cs.nw_resolved_phone || 0) > 0) lines.push(`     • 📞 Resolved By Phone: ${cs.nw_resolved_phone}`);
        lines.push('', '  ─────────────────────');
        lines.push(`  🔵 Warranty: *${wTotal}*   🔴 Non-W: *${nwTotal}*   📊 Total: *${grandTotal}*`, '');
    }

    const pendingTotal = ((cs.pending_parts || 0) + (cs.pending_approval || 0) + (cs.pending_other || 0)) || (cs.pending_calls || 0);
    if (pendingTotal > 0) {
        lines.push(`⏳ *PENDING CALLS*  (Total: ${pendingTotal})`, RULE);
        if ((cs.pending_parts || 0) > 0) lines.push(`     • Parts: ${cs.pending_parts}`);
        if ((cs.pending_approval || 0) > 0) lines.push(`     • Approval: ${cs.pending_approval}`);
        if ((cs.pending_other || 0) > 0) lines.push(`     • Other: ${cs.pending_other}`);
        if (!cs.pending_parts && !cs.pending_approval && !cs.pending_other && cs.pending_calls) lines.push(`     • ${cs.pending_calls}`);
        lines.push('');
    }

    // Closed + Pending together, so it is unambiguous how many calls the
    // engineer actually attended today (index.html:14697-14703).
    if (grandTotal > 0 || pendingTotal > 0) {
        lines.push(`📌 *FINAL TOTAL (Closed + Pending): ${grandTotal + pendingTotal}*`, '');
    }
    if ((cs.customer_reject || 0) > 0) lines.push(`❌ *CUSTOMER REJECT (Today):* ${cs.customer_reject}`, '');
    if ((cs.auto_site_visits || 0) > 0) lines.push(`🏗️ *SITE VISITS (Today):* ${cs.auto_site_visits}`, '');

    if (ow.length) {
        lines.push(`💼 *OFFICE / REMOTE WORK*  (${ow.length})`, RULE);
        ow.forEach((w, i) => lines.push(`  ${i + 1}. *${w.work_type}*${w.remark ? ' — ' + w.remark : ''}`));
        lines.push('');
    }

    const pmFiltered = pm.filter((p) => p.customer || (p.amount || 0) > 0);
    if (pmFiltered.length) {
        const total = d.total_amount != null ? d.total_amount : pmFiltered.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        lines.push('💰 *PAYMENT COLLECTED*', RULE);
        pmFiltered.forEach((p) => {
            const modeIcon = p.mode === 'Cash' ? '💵' : p.mode === 'Online' ? '📲' : '🏦';
            lines.push(`  ▸ ${p.customer} → *₹${p.amount}*  ${modeIcon} ${p.mode}`);
        });
        lines.push('  ─────────────────────', `  💵 *Total: ₹${total}*`, '');
    }

    if ((d.petrol_km || 0) > 0) lines.push('🚗 *TRAVEL*', RULE, `  ${d.petrol_km} KM`, '');

    if (gr.length) {
        lines.push(`⭐ *GOOGLE REVIEWS*  (${gr.length})`, RULE);
        gr.forEach((r) => lines.push(`  ▸ ${r.customer}  ${'⭐'.repeat(Math.min(Number(r.stars) || 5, 5))}`));
        lines.push('');
    }

    if (d.remarks) lines.push('📝 *REMARKS*', RULE, `  ${d.remarks}`, '');

    lines.push(DIV, '_Bhavi Electronics — CRM_');
    return lines.join('\n');
};

const emptyCallSummary = (): DrCallSummary => ({
    w_install: 0, w_breakdown: 0, w_repeat: 0, w_resolved_phone: 0,
    nw_breakdown: 0, nw_repeat: 0, nw_other: 0, nw_delivery: 0, nw_resolved_phone: 0,
    warranty_total: 0, nonwarranty_total: 0, grand_total: 0,
    pending_parts: 0, pending_approval: 0, pending_other: 0, pending_calls: 0, customer_reject: 0,
    auto_site_visits: 0,
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

        // Automation site visits — ENG002 only (index.html:14079-14083).
        if (engId === 'ENG002') cs.auto_site_visits = await fetchDrAutoSiteVisitCount(engId, date);
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
    officeWork?: DrOfficeWork[]; payments?: DrPayment[]; googleReviews?: DrGoogleReview[]; memberRole?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const cs = params.callSummary;
        // Only rows with a work type count (index.html:14559).
        const officeWork = (params.officeWork || []).filter((o) => o.work_type.trim());
        // A row counts if it has a name or a nonzero amount (index.html:14574).
        const payments = (params.payments || []).filter((p) => p.customer.trim() || p.amount > 0);
        const totalAmt = payments.reduce((s, p) => s + (p.amount || 0), 0);
        const googleReviews = (params.googleReviews || []).filter((g) => g.customer.trim() && g.stars);

        // Hard validation — a nonzero amount MUST name a mode (index.html:14580).
        if (payments.some((p) => p.amount > 0 && !p.mode)) {
            return { success: false, error: '💳 One or more Payment rows has an amount but no Mode (Cash/Online/Cheque/Card) selected — pick the mode, then Save.' };
        }

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
            office_work: officeWork, total_office_work: officeWork.length,
            payment_details: payments, total_amount: totalAmt,
            petrol_km: params.petrolKm,
            google_reviews: googleReviews, total_reviews: googleReviews.length,
            remarks: params.remarks,
        }]);
        if (error) throw error;

        // An Office Work entry with a time range also creates a matching Work Log
        // row, so the day's full picture (travel / ticket work / office work)
        // shows up in one place (index.html:14614-14628).
        for (const ow of officeWork) {
            if (!ow.from_time || !ow.to_time) continue;
            await saveWorkLog({
                eng_id: params.engId, eng_name: params.engName, member_role: params.memberRole || 'Engineer',
                log_date: params.date, from_time: ow.from_time, to_time: ow.to_time,
                task_description: `🏢 Office Work — ${ow.work_type}${ow.remark ? ' — ' + ow.remark : ''}`,
                ticket_id: null, log_type: 'work',
            } as any);
        }
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