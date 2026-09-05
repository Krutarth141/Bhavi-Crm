import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    fetchAllTickets,
    fetchDailyReports,
    fetchWCDailyReports,
    importTickets,
    enrichTicketsWithKm,
    ImportResult,
} from '@/services/reportsService';
import {
    Ticket,
    DailyReport,
    WCDailyReport,
    ImportRow,
    TicketFinancials,
    ReportTab,
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

// ─── Engineer's "closed" date (index.html:9467-9517 _engClosedDate) ───────────
// The date a call is "closed" from the engineer's side: the timeline entry
// where the engineer set a real completion status (Closed, Repaired, Pending
// for Delivery, Resolved By Phone — never Delivered/Invoice, which happen
// later) or, failing that, rejected the customer's estimate. A Back-Date
// close carries its real close date in the note text.
interface TlEntry { action?: string; at?: string; note?: string }

const COMPLETION_ACTIONS = ['Closed', 'Repaired', 'Pending for Delivery', 'Resolved By Phone'];

function tlEntryDate(e: TlEntry | null): string | null {
    if (!e) return null;
    if (e.action?.includes('Back-Date') && e.note) {
        const m = String(e.note).match(/for\s+(\d{4}-\d{2}-\d{2})/);
        if (m) return m[1];
    }
    return e.at ? new Date(e.at).toLocaleDateString('en-CA') : null;
}

function engCompletionEntry(tl: TlEntry[]): TlEntry | null {
    let last: TlEntry | null = null;
    tl.forEach((e) => {
        if (!e?.action || !e?.at) return;
        if (e.action.includes('Delivered') || e.action.includes('Invoice')) return;
        if (COMPLETION_ACTIONS.some((c) => e.action!.includes(c))) last = e;
    });
    if (!last) {
        tl.forEach((e) => { if (e?.action?.includes('Charges Set') && e?.at) last = e; });
    }
    return last;
}

function engRejectEntry(tl: TlEntry[]): TlEntry | null {
    let last: TlEntry | null = null;
    tl.forEach((e) => { if (e?.action?.includes('Reject') && e?.at) last = e; });
    return last;
}

function engClosedDate(t: Ticket): string | null {
    const tl = (t.timeline || []) as TlEntry[];
    return tlEntryDate(engCompletionEntry(tl) || engRejectEntry(tl));
}

// ─── Filter tab (index.html:9379-9604 renderReportFilter/runFilteredReport) ──

export interface FilterSearchFields {
    dateType: 'created' | 'closed';
    from: string;
    to: string;
    engineer: string;
    model: string;
    callType: string;
    status: string;
    customer: string;
    city: string;
    service: string;
}

export const DEFAULT_FILTER_FIELDS: FilterSearchFields = {
    dateType: 'created',
    from: '',
    to: '',
    engineer: '',
    model: '',
    callType: '',
    status: '',
    customer: '',
    city: '',
    service: '',
};

function computeFilteredResults(all: Ticket[], f: FilterSearchFields): Ticket[] {
    let list = all.slice();

    if (f.dateType === 'closed') {
        // index.html:9553-9563 — keep only tickets whose ENGINEER COMPLETION
        // date falls in range (never Delivered/Invoice dates).
        list = list.filter((t) => {
            const d = engClosedDate(t);
            if (!d) return false;
            return (!f.from || d >= f.from) && (!f.to || d <= f.to);
        });
    } else {
        list = list.filter((t) => {
            if (!t.created_at) return false;
            if (f.from && new Date(t.created_at) < new Date(`${f.from}T00:00:00`)) return false;
            if (f.to && new Date(t.created_at) > new Date(`${f.to}T23:59:59`)) return false;
            return true;
        });
    }

    if (f.engineer) list = list.filter((t) => t.assigned_name === f.engineer);
    if (f.model) list = list.filter((t) => (t.model || '').toLowerCase().includes(f.model.toLowerCase().trim()));
    if (f.callType) list = list.filter((t) => t.call_type === f.callType);
    if (f.status) list = list.filter((t) => t.status === f.status);
    if (f.service) list = list.filter((t) => t.service_type === f.service);
    // index.html:9566 — customer text matches name OR mobile
    if (f.customer) {
        const q = f.customer.toLowerCase();
        list = list.filter((t) => (t.cname || '').toLowerCase().includes(q) || (t.mobile || '').includes(f.customer));
    }
    if (f.city) list = list.filter((t) => (t.city || '').toLowerCase().includes(f.city.toLowerCase()));

    return list;
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
    const [activeTab, setActiveTab] = useState<ReportTab>('filter');

    // ── Tickets ──────────────────────────────────────────────────────────────
    const [allTickets, setAllTickets] = useState<Ticket[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(true);

    // ── Daily Reports ─────────────────────────────────────────────────────────
    const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
    const [dailyLoading, setDailyLoading] = useState(false);
    const [dailyLoaded, setDailyLoaded] = useState(false);

    // ── WC Daily Reports ──────────────────────────────────────────────────────
    const [wcReports, setWcReports] = useState<WCDailyReport[]>([]);
    const [wcLoading, setWcLoading] = useState(false);
    const [wcLoaded, setWcLoaded] = useState(false);

    // ── Filter & Download state (index.html:9379-9465 renderReportFilter) ────
    const [filterFields, setFilterFields] = useState<FilterSearchFields>(DEFAULT_FILTER_FIELDS);
    const [filterSearched, setFilterSearched] = useState(false);
    const [filterResults, setFilterResults] = useState<Ticket[]>([]);

    // ── Import state ──────────────────────────────────────────────────────────
    const [importProgress, setImportProgress] = useState(0);
    const [importTotal, setImportTotal] = useState(0);
    const [importRunning, setImportRunning] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    // ── Load tickets (mount + retry) ──────────────────────────────────────────
    const loadTickets = useCallback(async () => {
        try {
            setTicketsLoading(true);
            const data = await fetchAllTickets();
            setAllTickets(data);
        } catch (err) {
            console.error('Failed to fetch tickets:', err);
        } finally {
            setTicketsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    // ── Lazy-load tab data (retryable via *Loaded reset) ──────────────────────
    useEffect(() => {
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
    }, [activeTab, dailyLoaded, wcLoaded]);

    const retryTickets = useCallback(() => { loadTickets(); }, [loadTickets]);
    const retryDaily = useCallback(() => { setDailyLoaded(false); }, []);
    const retryWc = useCallback(() => { setWcLoaded(false); }, []);

    // ── Engineers list (for Filter tab's Engineer dropdown) ───────────────────
    const engineers = useMemo(
        () => [...new Set(allTickets.map((t) => t.assigned_name).filter(Boolean))] as string[],
        [allTickets]
    );

    // ── Filter tab: Search (index.html:9518-9569 runFilteredReport) ──────────
    // Gated behind an explicit Search click — results stay empty until then.
    const runFilteredSearch = useCallback(() => {
        const results = computeFilteredResults(allTickets, filterFields);
        setFilterResults(results);
        setFilterSearched(true);
    }, [allTickets, filterFields]);

    // Auto-runs the search if it hasn't been run yet (index.html:9606-9609
    // downloadFilteredReport: `if(!tickets){await runFilteredReport();...}`).
    const getSearchResults = useCallback((): Ticket[] => {
        if (filterSearched) return filterResults;
        const results = computeFilteredResults(allTickets, filterFields);
        setFilterResults(results);
        setFilterSearched(true);
        return results;
    }, [allTickets, filterFields, filterSearched, filterResults]);

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

    // ── Download Excel (index.html:9606-9699 downloadFilteredReport('excel')) ─
    const handleDownload = useCallback(async () => {
        const tickets = getSearchResults();
        if (!tickets.length) { alert('No data to download. Run search first.'); return; }

        const getTimeline = (t: Ticket): TlEntry[] => {
            let tl: unknown = t.timeline;
            if (typeof tl === 'string') { try { tl = JSON.parse(tl); } catch { tl = []; } }
            return Array.isArray(tl) ? (tl as TlEntry[]) : [];
        };
        const getVisitStartIso = (t: Ticket): string | null => {
            const e = getTimeline(t).find((e) => e.action === 'Visit Start');
            return e?.at || null;
        };
        const fmtTime = (iso: string | null): string => {
            if (!iso) return '';
            return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
        };
        const durFromIso = (isoFrom: string | null, dateStr?: string, hhMM?: string): string => {
            if (!isoFrom || !hhMM || !dateStr) return '';
            try {
                const from = new Date(isoFrom);
                const to = new Date(`${dateStr}T${hhMM}:00`);
                const m = Math.round((to.getTime() - from.getTime()) / 60000);
                if (m <= 0) return '';
                const h = Math.floor(m / 60), mn = m % 60;
                return h > 0 ? `${h}h ${mn > 0 ? mn + 'm' : ''}` : `${mn}m`;
            } catch { return ''; }
        };
        const durBetween = (dateStr?: string, h1?: string, h2?: string): string => {
            if (!h1 || !h2 || !dateStr) return '';
            try {
                const from = new Date(`${dateStr}T${h1}:00`);
                const to = new Date(`${dateStr}T${h2}:00`);
                const m = Math.round((to.getTime() - from.getTime()) / 60000);
                if (m <= 0) return '';
                const h = Math.floor(m / 60), mn = m % 60;
                return h > 0 ? `${h}h ${mn > 0 ? mn + 'm' : ''}` : `${mn}m`;
            } catch { return ''; }
        };

        const kmMap = await enrichTicketsWithKm(tickets);

        const XLSX = await import('xlsx');
        const data = tickets.map((t) => {
            const tAny = t as any;
            const sp = (t.spares || []).filter((s: any) => !s.requested);
            const partsTotal = sp.reduce((a, s) => a + (s.qty || 0) * (s.price || 0), 0);
            const grand = partsTotal + (parseFloat(String(t.labor)) || 0) + (parseFloat(String(t.other_charge)) || 0);
            const vsIso = getVisitStartIso(t);
            const km = kmMap[t.id];
            const mStart = km && km.start != null ? km.start : (tAny.meter_start || '');
            const mEnd = km && km.end != null ? km.end : (tAny.meter_end || '');
            const callKm = km && km.has && km.km > 0 ? km.km : '';
            return {
                'Ticket No': t.id,
                'Date': t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '-',
                'Customer': t.cname,
                'Mobile': t.mobile,
                'Alt Mobile': t.alt_mobile || '',
                'Address': t.address || '',
                'City': t.city || '',
                'Pin': t.pin || '',
                'Area': t.area || '',
                'Model': t.model,
                'Serial': t.serial,
                'Brand': t.brand_name || '',
                'Call Type': t.call_type,
                'Service Type': t.service_type,
                'Coverage': t.warranty_coverage || '',
                'Problem': t.problem,
                'Action Taken': tAny.work_done || '',
                'Cause': tAny.cause || '',
                'Engineer': t.assigned_name || '',
                'Status': t.status,
                'SE Call ID': t.se_call_id || '',
                'Visit Date': t.visit_date || '',
                'Visit Start': fmtTime(vsIso),
                'Time In': tAny.visit_in || '',
                'Travel Time': durFromIso(vsIso, t.visit_date, tAny.visit_in),
                'Time Out': tAny.visit_out || '',
                'Repair Time': durBetween(t.visit_date, tAny.visit_in, tAny.visit_out),
                'Meter Start': mStart,
                'Meter End': mEnd,
                'Call KM': callKm,
                'Parts Used': sp.map((s: any) => `${s.code || ''} ${s.name || ''} x${s.qty}`).join('; '),
                'Parts Total': partsTotal.toFixed(2),
                'Labor': t.labor || 0,
                'Other': t.other_charge || 0,
                'Grand Total': grand.toFixed(2),
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        XLSX.writeFile(wb, `bhavi_filtered_report_${new Date().toLocaleDateString('en-CA')}.xlsx`);
    }, [getSearchResults]);

    // ── Print (index.html:9700-9709 downloadFilteredReport('pdf')) ────────────
    const handlePrint = useCallback(() => {
        const tickets = getSearchResults();
        if (!tickets.length) { alert('No data to download. Run search first.'); return; }

        const rowsHtml = tickets.map((t) => {
            const rev = (t.spares || []).filter((s: any) => !s.requested).reduce((a, s) => a + (s.qty || 0) * (s.price || 0), 0)
                + (parseFloat(String(t.labor)) || 0) + (parseFloat(String(t.other_charge)) || 0);
            return `<tr><td>${t.id}</td><td>${t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '-'}</td><td>${t.cname}</td><td>${t.mobile}</td><td>${t.city || '-'}</td><td>${t.model}</td><td>${t.call_type}</td><td>${t.assigned_name || '-'}</td><td>${t.status}</td><td>₹${rev.toFixed(0)}</td></tr>`;
        }).join('');

        const win = window.open('', '_blank');
        if (!win) { alert('Please allow popups for printing'); return; }
        win.document.write(`<html><head><title>Report</title><style>body{font-family:Arial;padding:20px;font-size:11px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:4px 6px;}th{background:#f0f0f0;}</style></head><body>
      <h2>BHAVI ELECTRONICS — Filtered Report | ${tickets.length} records</h2>
      <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
      <table><thead><tr><th>Ticket</th><th>Date</th><th>Customer</th><th>Mobile</th><th>City</th><th>Model</th><th>Type</th><th>Engineer</th><th>Status</th><th>Revenue</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
      </table></body></html>`);
        win.document.close();
        setTimeout(() => win.print(), 400);
    }, [getSearchResults]);

    return {
        // tab
        activeTab, setActiveTab,
        // tickets
        allTickets, ticketsLoading,
        // daily reports
        dailyReports, dailyLoading,
        // wc reports
        wcReports, wcLoading,
        // import
        importProgress, importTotal, importRunning, importResult,
        handleImport,
        // filter tab
        filterFields, setFilterFields,
        filterSearched, filterResults,
        runFilteredSearch,
        engineers,
        // actions
        handleDownload,
        handlePrint,
        // retry (loading-timeout safeguard)
        retryTickets,
        retryDaily,
        retryWc,
    };
}