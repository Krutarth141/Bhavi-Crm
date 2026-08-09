import { useState, useEffect, useCallback } from 'react';
import { DailyReport, WCDailyReport } from '@/types/reports';
import { WeeklyFilter, getWeekRange } from '@/types/weeklyReport';
import {
    fetchDailyReportsRange, fetchWCDailyReportsRange, fetchTicketsRange, fetchPunchCountRange, WeeklyTicket,
} from '@/services/weeklyReportService';

// Revenue basis matches profitService.ts's established convention (final_charges
// falling back to labor/service_charges) — the real `tickets` schema doesn't
// have a `total_amount` column populated the way HTML's ticket-close flow uses it.
const revenueOf = (t: WeeklyTicket) => parseFloat(String(t.final_charges ?? t.labor ?? t.service_charges ?? 0)) || 0;

const prevRangeOf = (from: string, to: string) => {
    const fromD = new Date(from + 'T00:00:00');
    const toD = new Date(to + 'T00:00:00');
    const days = Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1;
    const prevTo = new Date(fromD); prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo); prevFrom.setDate(prevTo.getDate() - (days - 1));
    const fmt = (d: Date) => d.toLocaleDateString('en-CA');
    return { from: fmt(prevFrom), to: fmt(prevTo) };
};

export const useWeeklyReport = () => {
    const [filter, setFilter] = useState<WeeklyFilter>(getWeekRange());
    const [engReports, setEngReports] = useState<DailyReport[]>([]);
    const [wcReports, setWCReports] = useState<WCDailyReport[]>([]);
    const [tickets, setTickets] = useState<WeeklyTicket[]>([]);
    const [prevTickets, setPrevTickets] = useState<WeeklyTicket[]>([]);
    const [presentDays, setPresentDays] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const prev = prevRangeOf(filter.from, filter.to);
            const [eng, wc, tix, prevTix, present] = await Promise.all([
                fetchDailyReportsRange(filter.from, filter.to),
                fetchWCDailyReportsRange(filter.from, filter.to),
                fetchTicketsRange(filter.from, filter.to),
                fetchTicketsRange(prev.from, prev.to),
                fetchPunchCountRange(filter.from, filter.to),
            ]);
            setEngReports(eng);
            setWCReports(wc);
            setTickets(tix);
            setPrevTickets(prevTix);
            setPresentDays(present);
        } catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    }, [filter.from, filter.to]);

    useEffect(() => { load(); }, [load]);

    const closedList = tickets.filter(t => t.status === 'Closed');
    const prevClosedList = prevTickets.filter(t => t.status === 'Closed');
    const revenue = closedList.reduce((s, t) => s + revenueOf(t), 0);
    const prevRevenue = prevClosedList.reduce((s, t) => s + revenueOf(t), 0);
    const newTicketsList = tickets.filter(t => t.created_at && t.created_at.slice(0, 10) >= filter.from && t.created_at.slice(0, 10) <= filter.to);
    const collected = engReports.reduce((s, r) => s + (parseFloat(String(r.total_amount || 0)) || 0), 0);
    const totalKm = engReports.reduce((s, r) => s + (parseFloat(String(r.petrol_km || 0)) || 0), 0);

    // Engineer scorecard — closed calls + revenue from tickets (matches HTML's renderWeekly)
    const engMap: Record<string, { name: string; closed: number; revenue: number; newCalls: number }> = {};
    tickets.forEach(t => {
        const k = t.assigned_name || 'Unassigned';
        if (!engMap[k]) engMap[k] = { name: k, closed: 0, revenue: 0, newCalls: 0 };
        if (t.status === 'Closed') { engMap[k].closed++; engMap[k].revenue += revenueOf(t); }
        if (t.created_at && t.created_at.slice(0, 10) >= filter.from) engMap[k].newCalls++;
    });
    const engScorecard = Object.values(engMap).sort((a, b) => b.closed - a.closed);

    // Daily trend — calls closed per day across the range
    const dayMap: Record<string, number> = {};
    closedList.forEach(t => { const d = (t.updated_at || '').slice(0, 10); if (d) dayMap[d] = (dayMap[d] || 0) + 1; });
    const dayLabels: string[] = []; const dayVals: number[] = [];
    const cursor = new Date(filter.from + 'T00:00:00'); const end = new Date(filter.to + 'T00:00:00');
    while (cursor <= end) {
        const ds = cursor.toLocaleDateString('en-CA');
        dayLabels.push(cursor.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' }));
        dayVals.push(dayMap[ds] || 0);
        cursor.setDate(cursor.getDate() + 1);
    }

    return {
        filter, setFilter,
        engReports, wcReports,
        loading, error,
        closed: closedList.length, prevClosed: prevClosedList.length,
        revenue, prevRevenue,
        newTickets: newTicketsList.length,
        collected, totalKm, presentDays,
        engScorecard, dayLabels, dayVals,
        refetch: load,
    };
};