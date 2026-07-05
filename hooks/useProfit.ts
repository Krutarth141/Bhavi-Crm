import { useState, useEffect } from 'react';
import { TicketRevenue, EngineerRevenue, MonthRevenue, calcTicketRevenue } from '@/types/profit';
import { fetchRevenueTickets } from '@/services/profitService';

export const useProfit = (from?: string, to?: string) => {
    const [tickets, setTickets] = useState<TicketRevenue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true); setError(null);
        try { setTickets(await fetchRevenueTickets(from, to)); }
        catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [from, to]);

    // ── Derived ────────────────────────────────────────────────────────────────
    const totalRevenue = tickets.reduce((s, t) => s + calcTicketRevenue(t), 0);
    const closedTickets = tickets.filter(t => t.status === 'Closed');
    const avgPerCall = closedTickets.length ? totalRevenue / closedTickets.length : 0;

    // By engineer
    const byEng: Record<string, EngineerRevenue> = {};
    tickets.forEach(t => {
        const k = t.assigned_name || 'Unassigned';
        if (!byEng[k]) byEng[k] = { name: k, calls: 0, closed: 0, parts: 0, service: 0, total: 0 };
        const svc = parseFloat(String(t.service_charges || 0));
        const lab = parseFloat(String(t.labor || 0));
        const parts = (t.spares || []).filter(s => !s.requested).reduce((a, s) => a + (s.qty || 0) * (s.price || 0), 0);
        byEng[k].calls++;
        if (t.status === 'Closed') byEng[k].closed++;
        byEng[k].parts += parts;
        byEng[k].service += svc + lab;
        byEng[k].total += calcTicketRevenue(t);
    });
    const engRevenue = Object.values(byEng).sort((a, b) => b.total - a.total);

    // By month
    const byMonth: Record<string, MonthRevenue> = {};
    tickets.forEach(t => {
        const m = t.created_at?.slice(0, 7) || 'Unknown';
        if (!byMonth[m]) byMonth[m] = { month: m, calls: 0, parts: 0, service: 0, total: 0 };
        const svc = parseFloat(String(t.service_charges || 0));
        const lab = parseFloat(String(t.labor || 0));
        const parts = (t.spares || []).filter(s => !s.requested).reduce((a, s) => a + (s.qty || 0) * (s.price || 0), 0);
        byMonth[m].calls++;
        byMonth[m].parts += parts;
        byMonth[m].service += svc + lab;
        byMonth[m].total += calcTicketRevenue(t);
    });
    const monthRevenue = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));

    return { tickets, loading, error, totalRevenue, avgPerCall, engRevenue, monthRevenue, refetch: load };
};