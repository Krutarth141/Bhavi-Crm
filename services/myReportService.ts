import { supabase } from '@/lib/supabase';
import { Ticket } from '@/types/reports';

export const MYRPT_DONE_STATUSES = ['Closed', 'Delivered', 'Pending for Delivery', 'Repaired', 'Resolved By Phone', 'Customer Reject'];
export const MYRPT_PENDING_STATUSES = ['Pending Parts', 'Pending Customer Approval', 'Pending Engineer Stock', 'Pending Spare', 'Hold', 'Pending Repair Carry In', 'Pending Repair On Site', 'Pending Allocation', 'Pending Customer Arrival'];

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

const engClosedDate = (tl: TlEntry[]): string | null => tlEntryDate(engCompletionEntry(tl) || engRejectEntry(tl));

const statusEventDate = (t: Ticket): string | null => {
    const keyword = t.status;
    if (!keyword) return null;
    const tl = (t.timeline || []) as TlEntry[];
    let lastMatch: TlEntry | null = null;
    tl.forEach((entry) => {
        if (entry && entry.action && entry.action.indexOf(keyword) !== -1 && entry.at) lastMatch = entry;
    });
    if (!lastMatch) return null;
    return new Date((lastMatch as TlEntry).at!).toLocaleDateString('en-CA');
};

const invoiceDates = (t: Ticket): string[] => {
    const tl = t.timeline || [];
    return tl.filter((e: any) => e && e.action === 'Invoice Done' && e.at).map((e: any) => new Date(e.at).toLocaleDateString('en-CA'));
};

export interface MyReportDayRow {
    date: string;
    w: number;
    ow: number;
    pending: number;
    invoice: number;
}

export const fetchMyReport = async (engId: string, from: string, to: string): Promise<MyReportDayRow[]> => {
    let data: any[] = [];
    let pageFrom = 0;
    const PAGE = 1000;
    while (true) {
        const { data: page, error } = await supabase.from('tickets').select('id,status,call_type,timeline').eq('assigned_to', engId).range(pageFrom, pageFrom + PAGE - 1);
        if (error) throw error;
        data = data.concat(page || []);
        if (!page || page.length < PAGE) break;
        pageFrom += PAGE;
    }
    const tickets = data as Ticket[];

    const byDate: Record<string, MyReportDayRow> = {};
    const ensure = (d: string) => {
        if (!byDate[d]) byDate[d] = { date: d, w: 0, ow: 0, pending: 0, invoice: 0 };
        return byDate[d];
    };

    tickets.forEach(t => {
        const isW = t.call_type === 'Warranty' || t.call_type === 'Warranty Repeat' || t.call_type === 'AMC';
        if (MYRPT_DONE_STATUSES.includes(t.status)) {
            const d = engClosedDate((t.timeline || []) as TlEntry[]);
            if (d && d >= from && d <= to) { const row = ensure(d); if (isW) row.w++; else row.ow++; }
        } else if (MYRPT_PENDING_STATUSES.includes(t.status)) {
            const d = statusEventDate(t);
            if (d && d >= from && d <= to) ensure(d).pending++;
        }
        invoiceDates(t).forEach(d => { if (d >= from && d <= to) ensure(d).invoice++; });
    });

    const dates: string[] = [];
    const cur = new Date(from + 'T00:00:00');
    const end = new Date(to + 'T00:00:00');
    while (cur <= end) {
        dates.push(cur.toLocaleDateString('en-CA'));
        cur.setDate(cur.getDate() + 1);
    }
    return dates.map(d => byDate[d] || { date: d, w: 0, ow: 0, pending: 0, invoice: 0 });
};