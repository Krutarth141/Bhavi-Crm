import { supabase } from '@/lib/supabase';
import { Ticket } from '@/types/reports';

export const MYRPT_DONE_STATUSES = ['Closed', 'Delivered', 'Pending for Delivery', 'Repaired'];
export const MYRPT_PENDING_STATUSES = ['Pending Parts', 'Pending Customer Approval', 'Pending Engineer Stock', 'Pending Spare', 'Hold', 'Pending Repair Carry In', 'Pending Repair On Site', 'Pending Allocation', 'Pending Customer Arrival'];

const statusEventDate = (t: Ticket): string | null => {
    const keyword = t.status;
    if (!keyword) return null;
    const tl = t.timeline || [];
    let lastMatch: { at: string } | null = null;
    tl.forEach((entry: any) => {
        if (entry && entry.action && entry.action.indexOf(keyword) !== -1 && entry.at) lastMatch = entry;
    });
    if (!lastMatch) return null;
    return new Date((lastMatch as any).at).toLocaleDateString('en-CA');
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
            const d = statusEventDate(t);
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