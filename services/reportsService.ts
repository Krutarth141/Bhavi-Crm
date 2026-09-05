import { supabase } from '@/lib/supabase';
import { Ticket, DailyReport, WCDailyReport, ImportRow } from '@/types/reports';

// ─── Tickets ─────────────────────────────────────────────────────────────────

export async function fetchAllTickets(): Promise<Ticket[]> {
    let all: Ticket[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        if (!data || data.length < PAGE) break;
        from += PAGE;
    }
    return all;
}

// ─── Engineer Daily Reports ───────────────────────────────────────────────────

export async function fetchDailyReports(): Promise<DailyReport[]> {
    const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(100);
    if (error) throw error;
    return data || [];
}

// ─── WC Daily Reports ─────────────────────────────────────────────────────────

export async function fetchWCDailyReports(): Promise<WCDailyReport[]> {
    const { data, error } = await supabase
        .from('wc_daily_reports')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(100);
    if (error) throw error;
    return data || [];
}

// ─── Ticket ID Generator ──────────────────────────────────────────────────────

export async function generateTicketNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BEA-${year}-`;

    const { data, error } = await supabase
        .from('tickets')
        .select('id')
        .like('id', `${prefix}%`)
        .order('id', { ascending: false })
        .limit(1);

    if (error) throw error;

    let nextNum = 1;
    if (data && data.length > 0) {
        const last = data[0].id as string;
        const parts = last.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

// ─── Bulk Import ──────────────────────────────────────────────────────────────

export interface ImportResult {
    success: number;
    fail: number;
    errors: string[];
}

export async function importTickets(
    rows: ImportRow[],
    importedBy: string,
    onProgress?: (done: number, total: number) => void
): Promise<ImportResult> {
    let success = 0;
    let fail = 0;
    const errors: string[] = [];

    for (const row of rows) {
        try {
            const id = await generateTicketNo();
            const isW = ['Warranty', 'Warranty Repeat', 'AMC'].includes(row.call_type);
            const createdAt = row.created_at
                ? new Date(row.created_at).toISOString()
                : new Date().toISOString();

            // index.html:1584 — TAT Time (HH:MM) sets the ticket's tat_date to
            // the day AFTER the call date, at that time, in IST (blank = no TAT).
            const tatTime = String((row as unknown as Record<string, string>).tat_time || '').trim();
            const tatDate = (() => {
                if (!tatTime) return null;
                try {
                    const base = new Date(createdAt);
                    base.setDate(base.getDate() + 1);
                    const yyyy = base.getFullYear();
                    const mm = String(base.getMonth() + 1).padStart(2, '0');
                    const dd = String(base.getDate()).padStart(2, '0');
                    const d = new Date(`${yyyy}-${mm}-${dd}T${tatTime}:00+05:30`);
                    return isNaN(d.getTime()) ? null : d.toISOString();
                } catch {
                    return null;
                }
            })();

            const ticketData = {
                id,
                job_sheet: id,
                call_type: row.call_type,
                service_type: row.service_type,
                status: row.status || 'Pending Allocation',
                brand_name: row.brand_name,
                model: row.model,
                serial: row.serial,
                cname: row.cname,
                mobile: row.mobile,
                alt_mobile: row.alt_mobile || '',
                city: row.city || '',
                state: row.state || '',
                address: row.address || '',
                pin: row.pin || '',
                area: row.area || '',
                problem: row.problem,
                description: row.description || '',
                action: row.action || '',
                assigned_to: row.assigned_to || null,
                assigned_name: row.assigned_name || null,
                se_call_id: row.se_call_id || '',
                service_charges: parseFloat(row.service_charges || '0') || 0,
                labor: parseFloat(row.service_charges || '0') || 0,
                final_charges: parseFloat(row.final_charges || '0') || 0,
                warranty_coverage: row.warranty_coverage || (isW ? 'Under Coverage' : 'NA'),
                wc_type: row.wc_type || 'ICP',
                rerepair: row.rerepair || 'No',
                rerepair_foc: row.rerepair_foc === 'TRUE' || row.rerepair_foc === 'true',
                remarks: row.remarks || '',
                tat_date: tatDate,
                visit_date: row.visit_date || '',
                spares: [],
                timeline: [
                    {
                        action: 'Call Imported',
                        by: importedBy,
                        at: new Date().toISOString(),
                        note: 'Imported via bulk import',
                    },
                ],
                created_at: createdAt,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase.from('tickets').insert(ticketData);
            if (error) throw error;
            success++;
        } catch (err: unknown) {
            fail++;
            const msg = err instanceof Error ? err.message : 'Unknown error';
            errors.push(`${row.cname} (${row.model}): ${msg}`);
        }

        if (onProgress) onProgress(success + fail, rows.length);

        // Small delay to avoid rate limiting (matches HTML source)
        await new Promise((r) => setTimeout(r, 100));
    }

    return { success, fail, errors };
}

// ─── KM enrichment for the Filter tab's Excel export ──────────────────────────
// Mirrors HTML's downloadFilteredReport('excel') KM enrichment (index.html:
// 9617-9666): for each ticket's "arrival" km_log, the arrival reading is the
// Meter End; the previous valid reading by the same engineer on the same day
// is the Meter Start; the difference is the Call KM. Fully guarded — any
// failure here silently yields an empty map and the export falls back to the
// ticket's own meter_start/meter_end fields.
export interface KmEnrichment {
    start: number | null;
    end: number | null;
    km: number;
    has: boolean;
}

export async function enrichTicketsWithKm(tickets: { id: string }[]): Promise<Record<string, KmEnrichment>> {
    const kmMap: Record<string, KmEnrichment & { firstAt: string | null; lastAt: string | null }> = {};
    try {
        const tids = Array.from(new Set(tickets.map((t) => t.id).filter(Boolean)));
        if (!tids.length) return {};

        let arrivals: any[] = [];
        for (let i = 0; i < tids.length; i += 150) {
            const chunk = tids.slice(i, i + 150);
            const { data, error } = await supabase
                .from('km_logs')
                .select('id, ticket_id, eng_id, log_date, captured_at, odometer_km')
                .eq('entry_type', 'arrival')
                .in('ticket_id', chunk);
            if (error) throw error;
            if (data?.length) arrivals = arrivals.concat(data);
        }
        if (!arrivals.length) return {};

        const engSet = new Set<string>();
        let minD: string | null = null;
        let maxD: string | null = null;
        arrivals.forEach((a) => {
            if (a.eng_id) engSet.add(a.eng_id);
            if (a.log_date) {
                if (!minD || a.log_date < minD) minD = a.log_date;
                if (!maxD || a.log_date > maxD) maxD = a.log_date;
            }
        });

        let allLogs: any[] = [];
        if (engSet.size && minD && maxD) {
            const { data, error } = await supabase
                .from('km_logs')
                .select('id, ticket_id, eng_id, log_date, captured_at, odometer_km')
                .in('eng_id', Array.from(engSet))
                .gte('log_date', minD)
                .lte('log_date', maxD)
                .not('odometer_km', 'is', null)
                .order('captured_at', { ascending: true });
            if (error) throw error;
            allLogs = data || [];
        }

        const grp: Record<string, any[]> = {};
        allLogs.forEach((l) => {
            const k = `${l.eng_id}|${l.log_date}`;
            (grp[k] = grp[k] || []).push(l);
        });
        Object.keys(grp).forEach((k) => grp[k].sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()));

        // per-arrival segment: previous valid reading → this arrival reading
        const segById: Record<string, { start: number | null; end: number | null; at: string; km: number | null }> = {};
        arrivals.forEach((a) => {
            const seq = grp[`${a.eng_id}|${a.log_date}`] || [];
            const end = parseFloat(a.odometer_km);
            let start: number | null = null;
            const idx = seq.findIndex((s) => s.id === a.id);
            for (let p = idx - 1; p >= 0; p--) {
                const pv = parseFloat(seq[p].odometer_km);
                if (!isNaN(pv)) { start = pv; break; }
            }
            segById[a.id] = {
                start,
                end: isNaN(end) ? null : end,
                at: a.captured_at,
                km: (start !== null && !isNaN(end) && end >= start) ? end - start : null,
            };
        });

        // aggregate per ticket (a ticket may have multiple visits/arrivals)
        arrivals.forEach((a) => {
            const s = segById[a.id];
            if (!s) return;
            let m = kmMap[a.ticket_id];
            if (!m) { m = { start: null, end: null, km: 0, has: false, firstAt: null, lastAt: null }; kmMap[a.ticket_id] = m; }
            if (m.firstAt === null || (s.at && new Date(s.at) < new Date(m.firstAt))) { m.firstAt = s.at; m.start = s.start; }
            if (m.lastAt === null || (s.at && new Date(s.at) > new Date(m.lastAt))) { m.lastAt = s.at; m.end = s.end; }
            if (s.km !== null) m.km += s.km;
            m.has = true;
        });
    } catch (e) {
        console.log('KM export enrich skipped:', e instanceof Error ? e.message : e);
        return {};
    }
    return kmMap;
}

export async function saveWCDailyReport(payload: {
    wc_id: string; wc_name: string; report_date: string;
    inward: { warranty: number; non_warranty: number; other: number };
    outward: { warranty: number; non_warranty: number; other: number };
    reviews: { customer: string; stars: number }[];
    remarks: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const inwardTotal = payload.inward.warranty + payload.inward.non_warranty + payload.inward.other;
        const outwardTotal = payload.outward.warranty + payload.outward.non_warranty + payload.outward.other;
        const { error } = await supabase.from('wc_daily_reports').insert([{
            wc_id: payload.wc_id,
            wc_name: payload.wc_name,
            report_date: payload.report_date,
            customer_inward: inwardTotal,
            customer_outward: outwardTotal,
            other_inquiry: 0,
            total_inquiries: inwardTotal + outwardTotal,
            inward_breakdown: payload.inward,
            outward_breakdown: payload.outward,
            google_reviews: payload.reviews,
            total_reviews: payload.reviews.length,
            remarks: payload.remarks,
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
}