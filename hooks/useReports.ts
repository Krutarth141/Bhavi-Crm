import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    fetchAllTickets,
    fetchPunchLogs,
    fetchDailyReports,
    fetchWCDailyReports,
    verifyPunchLog as verifyPunchLogService,
    importTickets,
    ImportResult,
} from '@/services/reportsService';
import {
    Ticket,
    PunchLog,
    DailyReport,
    WCDailyReport,
    ImportRow,
    TicketFinancials,
    ReportFilters,
    EngineerStat,
    BarChartItem,
    ReportType,
    ReportTab,
    STATUS_OPTIONS,
    CALL_TYPE_OPTIONS,
    STATUS_COLORS,
    CALL_TYPE_COLORS,
    VALID_IMPORT_CALL_TYPES,
    VALID_IMPORT_SERVICE_TYPES,
    VALID_IMPORT_STATUSES,
    ImportValidationError,
} from '@/types/reports';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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
    to.setHours(23, 59, 59, 999);

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
    } else if (period === 'all') {
        from = new Date('2020-01-01');
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

// ─── Import validation (matches HTML source) ──────────────────────────────────

const IMPORT_REQUIRED = ['call_type', 'service_type', 'status', 'brand_name', 'model', 'serial', 'cname', 'mobile', 'problem'];

export function validateImportRows(rows: ImportRow[]): {
    valid: ImportRow[];
    errors: ImportValidationError[];
} {
    const valid: ImportRow[] = [];
    const errors: ImportValidationError[] = [];

    rows.forEach((row, i) => {
        const rowNum = i + 4; // data starts row 4 in template
        const rowErrors: string[] = [];

        IMPORT_REQUIRED.forEach((f) => {
            if (!row[f as keyof ImportRow]) rowErrors.push(`${f} missing`);
        });

        if (row.call_type && !VALID_IMPORT_CALL_TYPES.includes(row.call_type))
            rowErrors.push(`call_type invalid: ${row.call_type}`);
        if (row.service_type && !VALID_IMPORT_SERVICE_TYPES.includes(row.service_type))
            rowErrors.push(`service_type invalid: ${row.service_type}`);
        if (row.status && !VALID_IMPORT_STATUSES.includes(row.status))
            rowErrors.push(`status invalid: ${row.status}`);

        if (rowErrors.length) errors.push({ row: rowNum, errors: rowErrors });
        else valid.push(row);
    });

    return { valid, errors };
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useReports() {
    // ── Tab ──────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<ReportTab>('overview');

    // ── Tickets ──────────────────────────────────────────────────────────────
    const [allTickets, setAllTickets] = useState<Ticket[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(true);

    // ── Punch Logs ───────────────────────────────────────────────────────────
    const [punchLogs, setPunchLogs] = useState<PunchLog[]>([]);
    const [punchLoading, setPunchLoading] = useState(false);
    const [punchLoaded, setPunchLoaded] = useState(false);

    // ── Daily Reports ─────────────────────────────────────────────────────────
    const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
    const [dailyLoading, setDailyLoading] = useState(false);
    const [dailyLoaded, setDailyLoaded] = useState(false);

    // ── WC Daily Reports ──────────────────────────────────────────────────────
    const [wcReports, setWcReports] = useState<WCDailyReport[]>([]);
    const [wcLoading, setWcLoading] = useState(false);
    const [wcLoaded, setWcLoaded] = useState(false);

    // ── Filter & Download state ───────────────────────────────────────────────
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

    // ── Import state ──────────────────────────────────────────────────────────
    const [importProgress, setImportProgress] = useState(0);
    const [importTotal, setImportTotal] = useState(0);
    const [importRunning, setImportRunning] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    // ── Load tickets on mount ─────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                setTicketsLoading(true);
                const data = await fetchAllTickets();
                setAllTickets(data);
            } catch (err) {
                console.error('Failed to fetch tickets:', err);
            } finally {
                setTicketsLoading(false);
            }
        })();
    }, []);

    // ── Lazy-load tab data ────────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab === 'punch' && !punchLoaded) {
            setPunchLoading(true);
            fetchPunchLogs()
                .then((d) => { setPunchLogs(d); setPunchLoaded(true); })
                .catch(console.error)
                .finally(() => setPunchLoading(false));
        }
        if (activeTab === 'daily' && !dailyLoaded) {
            setDailyLoading(true);
            fetchDailyReports()
                .then((d) => { setDailyReports(d); setDailyLoaded(true); })
                .catch(console.error)
                .finally(() => setDailyLoading(false));
        }
        if (activeTab === 'wcdaily' && !wcLoaded) {
            setWcLoading(true);
            fetchWCDailyReports()
                .then((d) => { setWcReports(d); setWcLoaded(true); })
                .catch(console.error)
                .finally(() => setWcLoading(false));
        }
    }, [activeTab]);

    // ── Derived ticket data ───────────────────────────────────────────────────
    const filtered = useMemo(
        () => applyFilters(allTickets, period, customFrom, customTo, filters),
        [allTickets, period, customFrom, customTo, filters]
    );

    const totalCalls = filtered.length;
    const totalClosed = filtered.filter((t) => t.status === 'Closed').length;
    const totalRevenue = filtered.reduce((a, t) => a + getTicketFinancials(t).grand, 0);
    const closureRate = totalCalls > 0 ? Math.round((totalClosed / totalCalls) * 100) : 0;

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

    const monthlyRevenue: Record<string, number> = {};
    filtered.forEach((t) => {
        if (!t.created_at) return;
        const d = new Date(t.created_at);
        const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
        monthlyRevenue[key] = (monthlyRevenue[key] || 0) + getTicketFinancials(t).grand;
    });
    const revenueChartData: BarChartItem[] = Object.entries(monthlyRevenue)
        .slice(-6)
        .map(([label, value]) => ({ label, value: Math.round(value), color: '#1a56db' }));

    // Trend chart data (monthly + yearly — matches setTrendView in HTML)
    function getTrendData(view: 'monthly' | 'yearly') {
        const grp: Record<string, { w: number; nw: number; closed: number; total: number }> = {};
        allTickets.forEach((t) => {
            if (!t.created_at) return;
            const d = new Date(t.created_at);
            const k =
                view === 'monthly'
                    ? d.toLocaleString('en-IN', { month: 'short', year: '2-digit' })
                    : d.getFullYear().toString();
            if (!grp[k]) grp[k] = { w: 0, nw: 0, closed: 0, total: 0 };
            grp[k].total++;
            if (['Warranty', 'Warranty Repeat', 'AMC'].includes(t.call_type)) grp[k].w++;
            else grp[k].nw++;
            if (t.status === 'Closed') grp[k].closed++;
        });
        return Object.entries(grp).slice(view === 'monthly' ? -6 : -20);
    }

    const engineers = [
        ...new Set(allTickets.map((t) => t.assigned_name).filter(Boolean)),
    ] as string[];

    // ── Verify punch log ──────────────────────────────────────────────────────
    const handleVerifyPunch = useCallback(
        async (id: string, adminRemark: string, verifiedBy: string) => {
            await verifyPunchLogService(id, adminRemark, verifiedBy);
            // Refresh punch logs
            const updated = await fetchPunchLogs();
            setPunchLogs(updated);
        },
        []
    );

    // ── Import handler ────────────────────────────────────────────────────────
    const handleImport = useCallback(
        async (rows: ImportRow[], importedBy: string) => {
            setImportRunning(true);
            setImportTotal(rows.length);
            setImportProgress(0);
            setImportResult(null);

            const result = await importTickets(rows, importedBy, (done) => {
                setImportProgress(done);
            });

            setImportResult(result);
            setImportRunning(false);

            // Refresh tickets after import
            if (result.success > 0) {
                const fresh = await fetchAllTickets().catch(() => allTickets);
                setAllTickets(fresh);
            }
        },
        [allTickets]
    );

    // ── Download Excel ────────────────────────────────────────────────────────
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

    // ── Print ─────────────────────────────────────────────────────────────────
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
        <div><div class="co">Bhavi Electronics & Automation</div>
        <div style="font-size:11px;color:#555;">Service CRM Report — Generated: ${new Date().toLocaleString('en-IN')}</div></div>
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
        // tab
        activeTab, setActiveTab,
        // tickets
        allTickets, ticketsLoading,
        // punch logs
        punchLogs, punchLoading, handleVerifyPunch,
        // daily reports
        dailyReports, dailyLoading,
        // wc reports
        wcReports, wcLoading,
        // import
        importProgress, importTotal, importRunning, importResult,
        handleImport,
        // filter state
        period, setPeriod,
        customFrom, setCustomFrom,
        customTo, setCustomTo,
        filters, setFilters,
        reportType, setReportType,
        // derived
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
        getTrendData,
        // actions
        handleDownload,
        handlePrint,
    };
}