export interface Ticket {
    id: string;
    created_at: string;
    cname: string;
    mobile: string;
    alt_mobile?: string;
    city?: string;
    state?: string;
    address?: string;
    brand_name?: string;
    model?: string;
    serial?: string;
    call_type: string;
    service_type: string;
    warranty_coverage?: string;
    problem?: string;
    action?: string;
    fault_code?: string;
    assigned_name?: string;
    status: string;
    visit_date?: string;
    se_call_id?: string;
    spares?: { name?: string; code?: string; qty?: number; price?: number }[];
    service_charges?: number;
    labor?: number;
    other_charge?: number;
    final_charges?: number;
    remarks?: string;
}

export interface TicketFinancials {
    partsTotal: number;
    partsNames: string;
    svc: number;
    other: number;
    final: number;
    grand: number;
}

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

export const STATUS_OPTIONS = [
    'Pending Allocation',
    'Assigned',
    'In Progress',
    'Pending Customer Approval',
    'Closed',
    'Call Cancel',
];

export const CALL_TYPE_OPTIONS = ['Warranty', 'Non-Warranty', 'AMC'];

export const SERVICE_TYPE_OPTIONS = ['Repair', 'Installation', 'Maintenance', 'Carry In', 'On Site'];

export const STATUS_COLORS: Record<string, string> = {
    Closed: '#0e9f6e',
    'Call Cancel': '#f05252',
    'In Progress': '#1a56db',
};

export const CALL_TYPE_COLORS: Record<string, string> = {
    Warranty: '#0e9f6e',
    'Non-Warranty': '#f05252',
    AMC: '#1a56db',
};