// Exact tickets table columns used in engineer update
export interface EngineerTicket {
    id: string;
    job_sheet?: string;      // was js_no — correct column name
    cname?: string;
    mobile?: string;
    model?: string;
    serial?: string;
    brand_name?: string;
    problem?: string;
    call_type?: string;
    service_type?: string;
    assigned_name?: string;
    status?: string;
    service_charges?: number;
    labor?: number;
    address?: string;
    pin?: string;
    timeline?: any[];
    created_at?: string;
    updated_at?: string;
}

// Strict step-by-step transitions — engineer cannot skip
export const ENGINEER_ALLOWED_TRANSITIONS: Record<string, string[]> = {
    'Assigned': ['In Progress'],
    'In Progress': ['Closed'],
    'Pending Repair Carry In': ['Closed'],
    'Pending Repair On Site': ['Closed'],
};

export const ENGINEER_UPDATABLE = Object.keys(ENGINEER_ALLOWED_TRANSITIONS);
export const CLOSED_STATUSES = ['Closed', 'Call Cancel', 'Customer Reject'];

export interface UpdateForm {
    newStatus: string;
    note: string;
    labour: string;
}