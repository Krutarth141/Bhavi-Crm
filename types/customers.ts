export interface Customer {
    serial: string;
    cname: string | null;
    mobile: string | null;
    alt_mobile?: string | null;
    model?: string | null;
    address?: string | null;
    city?: string | null;
    pin?: string | null;
    area?: string | null;
    state?: string | null;
    portal_pin?: string | null;
    updated_at: string;
}

export interface CustomerFilter {
    searchTerm?: string;
    city?: string;
}