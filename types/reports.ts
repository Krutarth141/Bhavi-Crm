// ─── Ticket ──────────────────────────────────────────────────────────────────

export interface Ticket {
    id: string;
    created_at: string;
    cname: string;
    mobile: string;
    alt_mobile?: string;
    city?: string;
    state?: string;
    address?: string;
    pin?: string;
    area?: string;
    brand_name?: string;
    model?: string;
    serial?: string;
    call_type: string;
    service_type: string;
    warranty_coverage?: string;
    wc_type?: string;
    problem?: string;
    description?: string;
    action?: string;
    fault_code?: string;
    assigned_name?: string;
    assigned_to?: string;
    status: string;
    visit_date?: string;
    se_call_id?: string;
    spares?: { name?: string; code?: string; qty?: number; price?: number }[];
    service_charges?: number;
    labor?: number;
    other_charge?: number;
    final_charges?: number;
    rerepair?: string;
    rerepair_foc?: boolean;
    remarks?: string;
    timeline?: { action: string; by: string; at: string; note?: string }[];
    updated_at?: string;
    job_sheet?: string;
    priority?: string;
    condition?: string;
}

export interface TicketFinancials {
    partsTotal: number;
    partsNames: string;
    svc: number;
    other: number;
    final: number;
    grand: number;
}

// ─── Punch Logs ──────────────────────────────────────────────────────────────

export interface PunchLog {
    id: string;
    eng_name: string;
    punch_in_date: string;
    punch_in_time: string;
    punch_out_date?: string;
    punch_out_time?: string;
    start_meter?: string;
    end_meter?: string;
    status: 'active' | 'verified' | 'late_pending';
    late_remark?: string;
    admin_remark?: string;
    verified_by?: string;
    is_next_day?: boolean;
    created_at: string;
    updated_at?: string;
}

// ─── Engineer Daily Reports ───────────────────────────────────────────────────

export interface PaymentDetail {
    customer: string;
    amount: number;
    mode: 'Cash' | 'Online' | 'Card' | string;
}

export interface DailyReport {
    id: string;
    report_date: string;
    eng_name: string;
    warranty_installation: number;
    warranty_breakdown: number;
    outwarranty_breakdown: number;
    outwarranty_other: number;
    total_calls: number;
    petrol_km: number;
    total_amount: number;
    payment_details?: PaymentDetail[];
    remarks?: string;
    created_at?: string;
    // index.html:1387,1395 — Office Work column count. office_work is jsonb
    // (or a legacy JSON string), total_office_work a fallback stored count.
    office_work?: unknown;
    total_office_work?: number;
    // index.html:1399-1404 — legacy jsonb fallback for older rows that predate
    // the dedicated warranty_installation/warranty_breakdown/etc columns.
    call_summary?: {
        w_install?: number;
        w_breakdown?: number;
        w_repeat?: number;
        nw_breakdown?: number;
        nw_repeat?: number;
        nw_other?: number;
        nw_delivery?: number;
        grand_total?: number;
    };
}

// ─── WC Daily Reports ─────────────────────────────────────────────────────────

export interface GoogleReview {
    customer: string;
    stars: number;
}

export interface InOutBreakdown {
    warranty: number;
    non_warranty: number;
    other: number;
}

export interface WCDailyReport {
    id: string;
    report_date: string;
    wc_name: string;
    customer_inward: number;
    customer_outward: number;
    other_inquiry: number;
    total_inquiries: number;
    total_reviews: number;
    inward_breakdown?: InOutBreakdown;
    outward_breakdown?: InOutBreakdown;
    google_reviews?: GoogleReview[];
    remarks?: string;
    created_at?: string;
    wc_id?: string;
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportRow {
    ticket_id?: string;
    call_type: string;
    service_type: string;
    status: string;
    brand_name: string;
    model: string;
    serial: string;
    cname: string;
    mobile: string;
    alt_mobile?: string;
    city?: string;
    state?: string;
    address?: string;
    pin?: string;
    area?: string;
    problem: string;
    description?: string;
    action?: string;
    assigned_name?: string;
    assigned_to?: string;
    se_call_id?: string;
    service_charges?: string;
    final_charges?: string;
    warranty_coverage?: string;
    wc_type?: string;
    rerepair?: string;
    rerepair_foc?: string;
    remarks?: string;
    visit_date?: string;
    created_at?: string;
}

export interface ImportValidationError {
    row: number;
    errors: string[];
}

// ─── Report Filters ───────────────────────────────────────────────────────────

export interface ReportFilters {
    status: string;
    service: string;
    calltype: string;
    engineer: string;
    city: string;
}

export interface EngineerStat {
    calls: number;
    closed: number;
    revenue: number;
}

export interface BarChartItem {
    label: string;
    value: number;
    color?: string;
}

export type ReportType = 'tickets' | 'revenue' | 'engineers' | 'status';

export type ReportTab =
    | 'filter'
    | 'revenue'
    | 'daily'
    | 'wcdaily'
    | 'import'
    | 'tat';

// ─── Constants ────────────────────────────────────────────────────────────────

export const STATUS_OPTIONS = [
    'Pending Allocation',
    'Assigned',
    'In Progress',
    'Pending Customer Approval',
    'Customer Approved',
    'Pending Parts',
    'Pending Repair Carry In',
    'Pending Repair On Site',
    'Closed',
    'Call Cancel',
    'Customer Reject',
];

export const CALL_TYPE_OPTIONS = [
    'Warranty',
    'Non-Warranty',
    'AMC',
    'Warranty Repeat',
    'Non-Warranty Repeat',
    'Other',
];

export const SERVICE_TYPE_OPTIONS = ['Carry In', 'On Site'];

export const VALID_IMPORT_CALL_TYPES = [
    'Warranty',
    'Non-Warranty',
    'AMC',
    'Warranty Repeat',
    'Non-Warranty Repeat',
];

export const VALID_IMPORT_SERVICE_TYPES = ['Carry In', 'On Site'];

export const VALID_IMPORT_STATUSES = [
    'Pending Allocation',
    'Assigned',
    'In Progress',
    'Pending Customer Approval',
    'Customer Approved',
    'Pending Parts',
    'Pending Repair Carry In',
    'Pending Repair On Site',
    'Closed',
    'Call Cancel',
    'Customer Reject',
];

export const STATUS_COLORS: Record<string, string> = {
    'Pending Allocation': '#ff9800',
    Assigned: '#1a56db',
    'In Progress': '#7c3aed',
    'Pending Customer Approval': '#d97706',
    'Customer Approved': '#059669',
    'Pending Parts': '#dc2626',
    'Pending Repair Carry In': '#9333ea',
    'Pending Repair On Site': '#0891b2',
    Closed: '#0e9f6e',
    'Call Cancel': '#64748b',
    'Customer Reject': '#f05252',
};

export const CALL_TYPE_COLORS: Record<string, string> = {
    Warranty: '#0e9f6e',
    'Non-Warranty': '#f05252',
    AMC: '#1a56db',
    'Warranty Repeat': '#d97706',
    'Non-Warranty Repeat': '#dc2626',
    Other: '#64748b',
};

// index.html:9213-9218 — order and exact labels.
export const REPORT_TABS: { key: ReportTab; label: string }[] = [
    { key: 'filter', label: '🔍 Filter & Download' },
    { key: 'revenue', label: '💰 Revenue' },
    { key: 'tat', label: '⏱️ TAT Compliance' },
    { key: 'daily', label: '📋 Eng Daily Reports' },
    { key: 'wcdaily', label: '🎯 WC Daily Reports' },
    { key: 'import', label: '📥 Import Calls' },
];