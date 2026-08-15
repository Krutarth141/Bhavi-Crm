import { supabase } from '@/lib/supabase';
import { tatDeadline } from '@/utils/tatHelpers';

const COMPLETION_STATUSES = ['Closed', 'Repaired', 'Pending for Delivery', 'Resolved By Phone', 'Delivered'];
const COMPLETION_ACTIONS = ['Closed', 'Repaired', 'Pending for Delivery', 'Resolved By Phone'];

interface TatTicket {
    id: string;
    cname?: string;
    mobile?: string;
    model?: string;
    assigned_name?: string;
    assigned_to?: string;
    tat_date?: string;
    timeline?: any[];
}

// Mirrors HTML's _engCompletionEntry(): finds the timeline entry marking when
// the engineer actually finished the repair — never a later Delivered/Invoice
// entry — falling back to a legacy 'Charges Set' entry for old Non-Warranty closes.
const engCompletionEntry = (t: TatTicket): { action: string; at: string } | null => {
    const tl = t.timeline || [];
    let last: { action: string; at: string } | null = null;
    tl.forEach((e: any) => {
        if (!e?.action || !e?.at) return;
        if (e.action.includes('Delivered') || e.action.includes('Invoice')) return;
        if (COMPLETION_ACTIONS.some(c => e.action.includes(c))) last = e;
    });
    if (!last) {
        tl.forEach((e: any) => { if (e?.action?.includes('Charges Set') && e?.at) last = e; });
    }
    return last;
};

export interface TatReportRow {
    id: string;
    cname?: string;
    mobile?: string;
    model?: string;
    eng?: string;
    closedAt: Date;
    deadline: Date;
    withinTAT: boolean;
    diffHrs: number;
}

export const loadTatReport = async (
    from: string, to: string, engFilter: string, statusFilter: '' | 'within' | 'outside'
): Promise<TatReportRow[]> => {
    let data: any[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
        let q = supabase.from('tickets')
            .select('id, cname, mobile, model, assigned_name, assigned_to, tat_date, timeline')
            .not('tat_date', 'is', null)
            .in('status', COMPLETION_STATUSES);
        if (engFilter) q = q.eq('assigned_to', engFilter);
        const { data: page, error } = await q.range(from, from + PAGE - 1);
        if (error) throw error;
        data = data.concat(page || []);
        if (!page || page.length < PAGE) break;
        from += PAGE;
    }

    const rows: TatReportRow[] = [];
    (data || []).forEach((t: TatTicket) => {
        const entry = engCompletionEntry(t);
        if (!entry?.at) return;
        const closedAt = new Date(entry.at);
        const closedDateStr = closedAt.toLocaleDateString('en-CA');
        if (from && closedDateStr < from) return;
        if (to && closedDateStr > to) return;
        const deadline = tatDeadline(t.tat_date!);
        const withinTAT = closedAt <= deadline;
        if (statusFilter === 'within' && !withinTAT) return;
        if (statusFilter === 'outside' && withinTAT) return;
        rows.push({
            id: t.id, cname: t.cname, mobile: t.mobile, model: t.model, eng: t.assigned_name,
            closedAt, deadline, withinTAT, diffHrs: (closedAt.getTime() - deadline.getTime()) / 3600000,
        });
    });
    return rows;
};