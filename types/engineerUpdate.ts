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
    warranty_coverage?: string; // needed by getAllowedStatuses
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

export interface UpdateForm {
    newStatus: string;
    note: string;
    labour: string;
}