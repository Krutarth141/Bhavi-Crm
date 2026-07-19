export interface CompanyInfo {
    id?: number;
    logo_url?: string | null;
    company_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    gst_no?: string;
    gst_pct?: number;        // default parts GST %, e.g. 18
    labor_gst_pct?: number;  // labor/service GST %, e.g. 18
    website?: string;
    terms?: string;          // invoice terms, newline-separated
    upi_qr_url?: string | null;
}