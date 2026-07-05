import { useState, useEffect } from 'react';
import { DailyReport, WCDailyReport, WeeklyFilter, getWeekRange } from '@/types/weeklyReport';
import { fetchDailyReports, fetchWCDailyReports, fetchTicketSummary } from '@/services/weeklyReportService';

export const useWeeklyReport = () => {
    const [filter, setFilter] = useState<WeeklyFilter>(getWeekRange());
    const [engReports, setEngReports] = useState<DailyReport[]>([]);
    const [wcReports, setWCReports] = useState<WCDailyReport[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true); setError(null);
        try {
            const [eng, wc, tix] = await Promise.all([
                fetchDailyReports(filter.from, filter.to),
                fetchWCDailyReports(filter.from, filter.to),
                fetchTicketSummary(filter.from, filter.to),
            ]);
            setEngReports(eng);
            setWCReports(wc);
            setTickets(tix);
        } catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [filter.from, filter.to]);

    // Ticket summary
    const totalCalls = tickets.length;
    const closedCalls = tickets.filter(t => t.status === 'Closed').length;
    const totalRev = tickets.filter(t => t.call_type !== 'Warranty')
        .reduce((s, t) => s + parseFloat(t.final_charges || t.service_charges || 0), 0);

    // Engineer summary from daily_reports
    const engSummary: Record<string, { calls: number; closed: number; reviews: number }> = {};
    engReports.forEach(r => {
        if (!engSummary[r.eng_name]) engSummary[r.eng_name] = { calls: 0, closed: 0, reviews: 0 };
        engSummary[r.eng_name].calls += r.calls_done || 0;
        engSummary[r.eng_name].closed += r.calls_closed || 0;
        engSummary[r.eng_name].reviews += r.google_reviews || 0;
    });

    return {
        filter, setFilter,
        engReports, wcReports, tickets,
        loading, error,
        totalCalls, closedCalls, totalRev,
        engSummary,
        refetch: load,
    };
};