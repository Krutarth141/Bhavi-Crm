import { useState, useEffect, useCallback } from 'react';
import { fetchAllTickets } from '@/services/reportsService';
import {
    Ticket,
    TicketFinancials,
    ReportFilters,
    EngineerStat,
    BarChartItem,
    ReportType,
    STATUS_OPTIONS,
    CALL_TYPE_OPTIONS,
    STATUS_COLORS,
    CALL_TYPE_COLORS,
} from '@/types/reports';

// ─── Pure helpers ────────────────────────────────────────────────────────────

export function getTicketFinancials(t: Ticket): TicketFinancials {
    const spares = t.spares || [];
    const partsTotal = spares.reduce((a, s) => a + (s.qty || 0) * (s.price || 0), 0);
    const partsNames = spares
        .map((s) => (s.name || s.code || '') + ' x' + (s.qty || 1))
        .filter(Boolean)
        .join(', ');
    const svc = parseFloat(String(t.service_charges)) || parseFloat(String(t.labor)) || 0;
    const other = parseFloat(String(t.other_charge)) || 0;
    const final = parseFloat(String(t.final_charges)) || 0;
    const grand = final > 0 ? final : svc + partsTotal + other;
    return { partsTotal, partsNames, svc, other, final, grand };
}

function getReportDates(period: string, customFrom: string, customTo: string) {
    const now = new Date();
    let from = new Date(0);
    let to = new Date();

    if (period === 'today') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
        from = new Date(now);
        from.setDate(now.getDate() - now.getDay());
        from.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
        from = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'custom' && customFrom && customTo) {
        from = new Date(customFrom);
        to = new Date(customTo);
        to.setHours(23, 59, 59, 999);
    }
    return { from, to };
}

function applyFilters(
    tickets: Ticket[],
    period: string,
    customFrom: string,
    customTo: string,
    filters: ReportFilters
): Ticket[] {
    const { from, to } = getReportDates(period, customFrom, customTo);
    return tickets.filter((t) => {
        const d = t.created_at ? new Date(t.created_at) : null;
        if (d && (d < from || d > to)) return false;
        if (filters.status && t.status !== filters.status) return false;
        if (filters.service && t.service_type !== filters.service) return false;
        if (filters.calltype && t.call_type !== filters.calltype) return false;
        if (filters.engineer && t.assigned_name !== filters.engineer) return false;
        if (filters.city && !(t.city || '').toLowerCase().includes(filters.city.toLowerCase().trim())) return false;
        return true;
    });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useReports() {
    const [allTickets, setAllTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [filters, setFilters] = useState<ReportFilters>({
        status: '',
        service: '',
        calltype: '',
        engineer: '',
        city: '',
    });
    const [reportType, setReportType] = useState<ReportType>('tickets');

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await fetchAllTickets();
                setAllTickets(data);
            } catch (err) {
                console.error('Failed to fetch tickets:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = applyFilters(allTickets, period, customFrom, customTo, filters);

    // KPIs
    const totalCalls = filtered.length;
    const totalClosed = filtered.filter((t) => t.status === 'Closed').length;
    const totalRevenue = filtered.reduce((a, t) => a + getTicketFinancials(t).grand, 0);
    const closureRate = totalCalls > 0 ? Math.round((totalClosed / totalCalls) * 100) : 0;

    // Chart data
    const statusChartData: BarChartItem[] = STATUS_OPTIONS.map((s) => ({
        label: s,
        value: filtered.filter((t) => t.status === s).length,
        color: STATUS_COLORS[s] || '#ff9800',
    }));

    const callTypeChartData: BarChartItem[] = CALL_TYPE_OPTIONS.map((c) => ({
        label: c,
        value: filtered.filter((t) => t.call_type === c).length,
        color: CALL_TYPE_COLORS[c] || '#ff9800',
    }));

    // Engineer-wise
    const engMap: Record<string, EngineerStat> = {};
    filtered.forEach((t) => {
        const name = t.assigned_name || 'Unassigned';
        if (!engMap[name]) engMap[name] = { calls: 0, closed: 0, revenue: 0 };
        engMap[name].calls++;
        if (t.status === 'Closed') engMap[name].closed++;
        engMap[name].revenue += getTicketFinancials(t).grand;
    });
    const engData = Object.entries(engMap).sort((a, b) => b[1].calls - a[1].calls);

    const engineerChartData: BarChartItem[] = engData.map(([name, d]) => ({
        label: name,
        value: d.calls,
        color: '#7c3aed',
    }));

    // Monthly revenue (last 6 months)
    const monthlyRevenue: Record<string, number> = {};
    filtered.forEach((t) => {
        const d = new Date(t.created_at);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyRevenue[key] = (monthlyRevenue[key] || 0) + getTicketFinancials(t).grand;
    });
    const revenueChartData: BarChartItem[] = Object.entries(monthlyRevenue)
        .slice(-6)
        .map(([label, value]) => ({ label, value: Math.round(value), color: '#1a56db' }));

    // Unique engineers for filter dropdown
    const engineers = [...new Set(allTickets.map((t) => t.assigned_name).filter(Boolean))] as string[];

    // ── Download Excel ──────────────────────────────────────────────────────────
    const handleDownload = useCallback(async () => {
        if (!filtered.length) { alert('No data for selected filters'); return; }
        const XLSX = await import('xlsx');
        const data = filtered.map((t) => {
            const { partsTotal, partsNames, svc, other, final, grand } = getTicketFinancials(t);
            return {
                'Ticket ID': t.id || '',
                'Date': t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '',
                'Customer': t.cname || '',
                'Mobile': t.mobile || '',
                'Alt Mobile': t.alt_mobile || '',
                'City': t.city || '',
                'State': t.state || '',
                'Address': t.address || '',
                'Brand': t.brand_name || '',
                'Model': t.model || '',
                'Serial No': t.serial || '',
                'Call Type': t.call_type || '',
                'Service Type': t.service_type || '',
                'Coverage': t.warranty_coverage || '',
                'Problem': t.problem || '',
                'Action Taken': t.action || '',
                'Fault Code': t.fault_code || '',
                'Engineer': t.assigned_name || 'Unassigned',
                'Status': t.status || '',
                'Visit Date': t.visit_date || '',
                'SE Call ID': t.se_call_id || '',
                'Parts Used': partsNames,
                'Parts ₹': partsTotal.toFixed(2),
                'Service/Labour ₹': svc.toFixed(2),
                'Other ₹': other.toFixed(2),
                'Final Charges ₹': final.toFixed(2),
                'Grand Total ₹': grand.toFixed(2),
                'Remarks': t.remarks || '',
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
            { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 25 },
            { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 25 },
            { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 30 },
            { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        const dateStr = new Date().toLocaleDateString('en-CA');
        XLSX.writeFile(wb, `BhaviCRM_Report_${period}_${dateStr}.xlsx`);
    }, [filtered, period]);

    // ── Print ───────────────────────────────────────────────────────────────────
    const handlePrint = useCallback(() => {
        if (!filtered.length) { alert('No data for selected filters'); return; }
        const totalParts = filtered.reduce((a, t) => a + getTicketFinancials(t).partsTotal, 0);
        const totalSvc = filtered.reduce((a, t) => a + getTicketFinancials(t).svc, 0);
        const totalGrand = filtered.reduce((a, t) => a + getTicketFinancials(t).grand, 0);

        const rows = filtered.map((t, i) => {
            const { partsTotal, partsNames, svc, grand } = getTicketFinancials(t);
            return `<tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${t.id}</td>
        <td>${t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : ''}</td>
        <td>${t.cname || ''}</td>
        <td>${t.mobile || ''}</td>
        <td>${t.city || ''}</td>
        <td>${t.model || ''}</td>
        <td>${t.serial || ''}</td>
        <td>${t.call_type || ''}</td>
        <td>${t.service_type || ''}</td>
        <td>${t.problem || ''}</td>
        <td>${t.assigned_name || '—'}</td>
        <td><b>${t.status || ''}</b></td>
        <td style="text-align:right;">${partsNames || '—'}</td>
        <td style="text-align:right;">${partsTotal.toFixed(0)}</td>
        <td style="text-align:right;">${svc.toFixed(0)}</td>
        <td style="text-align:right;font-weight:700;">${grand.toFixed(0)}</td>
      </tr>`;
        }).join('');

        const win = window.open('', '_blank');
        if (!win) { alert('Please allow popups for printing'); return; }
        win.document.write(`<!DOCTYPE html><html><head><title>Bhavi CRM Report</title>
      <style>
        @page{size:A4 landscape;margin:10mm;}
        body{font-family:Arial,sans-serif;font-size:10px;}
        table{width:100%;border-collapse:collapse;}
        th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;}
        th{background:#e8efff;font-weight:700;font-size:10px;}
        .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:2px solid #1a56db;padding-bottom:6px;}
        .co{font-size:16px;font-weight:900;color:#1a56db;}
        .summary{display:flex;gap:20px;margin-bottom:8px;font-size:11px;}
        .sum-item{background:#f0f4ff;padding:4px 10px;border-radius:4px;}
        .tfoot td{background:#f0f4ff;font-weight:700;}
      </style></head><body>
      <div class="header">
        <div>
          <div class="co">Bhavi Electronics & Automation</div>
          <div style="font-size:11px;color:#555;">Service CRM Report — Generated: ${new Date().toLocaleString('en-IN')}</div>
        </div>
        <div style="text-align:right;font-size:11px;">Period: ${period} | Total: ${filtered.length} records</div>
      </div>
      <div class="summary">
        <div class="sum-item">Total Calls: <b>${filtered.length}</b></div>
        <div class="sum-item">Closed: <b>${totalClosed}</b></div>
        <div class="sum-item">Parts ₹: <b>${totalParts.toFixed(0)}</b></div>
        <div class="sum-item">Service ₹: <b>${totalSvc.toFixed(0)}</b></div>
        <div class="sum-item">Grand Total ₹: <b>${totalGrand.toFixed(0)}</b></div>
      </div>
      <table><thead><tr>
        <th>#</th><th>Ticket</th><th>Date</th><th>Customer</th><th>Mobile</th><th>City</th>
        <th>Model</th><th>Serial</th><th>Call Type</th><th>Service</th><th>Problem</th>
        <th>Engineer</th><th>Status</th><th>Parts Used</th><th>Parts ₹</th><th>Service ₹</th><th>Total ₹</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="14" style="text-align:right;font-weight:700;">TOTAL</td>
        <td style="text-align:right;">${totalParts.toFixed(0)}</td>
        <td style="text-align:right;">${totalSvc.toFixed(0)}</td>
        <td style="text-align:right;font-weight:900;color:#1a56db;">${totalGrand.toFixed(0)}</td>
      </tr></tfoot>
      </table>
      <script>window.print();<\/script></body></html>`);
        win.document.close();
    }, [filtered, period, totalClosed]);

    return {
        // state
        loading,
        period,
        setPeriod,
        customFrom,
        setCustomFrom,
        customTo,
        setCustomTo,
        filters,
        setFilters,
        reportType,
        setReportType,
        filtered,
        engineers,
        engData,
        totalCalls,
        totalClosed,
        totalRevenue,
        closureRate,
        statusChartData,
        callTypeChartData,
        engineerChartData,
        revenueChartData,
        handleDownload,
        handlePrint,
    };
}