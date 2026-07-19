export interface TicketSpare {
    name?: string;
    code?: string;
    qty?: number;
    price?: number;      // MRP, GST-inclusive
    gst_pct?: number;
}

export interface Ticket {
    id: string;
    call_type: string;
    service_type: string;
    status: string;
    brand_name: string;
    model: string;
    serial: string;
    cname: string;
    mobile: string;
    city: string;
    state?: string;
    pin?: string;
    area?: string;
    address?: string;
    problem: string;
    description?: string;
    assigned_name: string;
    assigned_to?: string;
    warranty_coverage: string;
    created_at: string;
    updated_at?: string;
    service_charges: number;
    labor?: number;
    se_call_id?: string;
    visit_date?: string;
    rerepair?: boolean;
    rerepair_foc?: boolean;
    final_charges?: number;
    wc_type?: string;
    remarks?: string;
    alt_mobile?: string;
    condition?: string;
    accessories?: string;
    job_sheet?: string;
    priority?: string;
    fault_code?: string;
    action?: string;
    timeline?: any[];
    spares?: TicketSpare[];
    other_charge?: number;
    parts_cost?: number;
    eng_remarks?: string;
    work_done?: string;
    invoice_done?: boolean;
    invoice_no?: string;
    warranty_claim_pending?: boolean;
    warranty_claim_by?: string;
    warranty_claim_note?: string;
    warranty_claim_approved?: boolean;
    warranty_claim_approved_by?: string;
    coverage_remark?: string;
}

export const statusBadges: Record<string, string> = {
    'Pending Customer Arrival': 'badge-pending',
    'Pending Allocation': 'badge-pending',
    'Assigned': 'badge-open',
    'In Progress': 'badge-progress',
    'Pending Customer Approval': 'badge-pending',
    'Customer Approved': 'badge-approve',
    'Pending Parts': 'badge-hold',
    'Pending Engineer Stock': 'badge-hold',
    'Pending Repair Carry In': 'badge-hold',
    'Pending Repair On Site': 'badge-hold',
    'Repaired': 'badge-progress',
    'Sent to MSC': 'badge-hold',
    'Pending for Delivery': 'badge-hold',
    'Resolved By Phone': 'badge-closed',
    'Delivered': 'badge-closed',
    'Closed': 'badge-closed',
    'Call Cancel': 'badge-cancel',
    'Customer Reject': 'badge-reject',
};

export const callTypeBadges: Record<string, string> = {
    'Warranty': 'badge-warranty',
    'Non-Warranty': 'badge-open',
    'AMC': 'badge-warranty',
    'Warranty Repeat': 'badge-warranty',
    'Non-Warranty Repeat': 'badge-open',
    'Other': 'badge-hold',
};

export const statusOptions = [
    'Pending Customer Arrival',
    'Pending Allocation',
    'Assigned',
    'In Progress',
    'Pending Repair Carry In',
    'Pending Repair On Site',
    'Pending Parts',
    'Pending Engineer Stock',
    'Pending Customer Approval',
    'Customer Approved',
    'Customer Reject',
    'Call Cancel',
    'Closed',
    'Repaired',
    'Sent to MSC',
    'Pending for Delivery',
    'Resolved By Phone',
];

export const callTypeOptions = ['Warranty', 'Non-Warranty', 'AMC', 'Warranty Repeat', 'Non-Warranty Repeat', 'Other'];

export const serviceTypeOptions = ['On Site', 'Carry In'];

export const warrantyOptions = ['Under Coverage', 'Out of Coverage', 'Expired', 'AMC'];