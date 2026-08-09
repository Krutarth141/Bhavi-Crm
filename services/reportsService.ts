import { supabase } from '@/lib/supabase';
import { Ticket, PunchLog, DailyReport, WCDailyReport, ImportRow } from '@/types/reports';

// ─── Tickets ─────────────────────────────────────────────────────────────────

export async function fetchAllTickets(): Promise<Ticket[]> {
    const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

// ─── Punch Logs ──────────────────────────────────────────────────────────────

export async function fetchPunchLogs(): Promise<PunchLog[]> {
    const { data, error } = await supabase
        .from('punch_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
    if (error) throw error;
    return data || [];
}

export async function verifyPunchLog(
    id: string,
    adminRemark: string,
    verifiedBy: string
): Promise<void> {
    const { error } = await supabase
        .from('punch_logs')
        .update({
            status: 'verified',
            admin_remark: adminRemark || 'Approved',
            verified_by: verifiedBy,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    if (error) throw error;
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