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
}

export const statusBadges: Record<string, string> = {
    'Pending Allocation': 'badge-pending',
    'Assigned': 'badge-open',
    'In Progress': 'badge-progress',
    'Pending Customer Approval': 'badge-pending',
    'Customer Approved': 'badge-approve',
    'Pending Parts': 'badge-hold',
    'Pending Repair Carry In': 'badge-hold',
    'Pending Repair On Site': 'badge-hold',
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

export const callTypeOptions = ['Warranty', 'Non-Warranty', 'AMC', 'Warranty Repeat', 'Non-Warranty Repeat', 'Other'];

export const serviceTypeOptions = ['On Site', 'Carry In'];

export const warrantyOptions = ['Under Coverage', 'Out of Coverage', 'Expired', 'AMC'];
