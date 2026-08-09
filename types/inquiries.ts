// auto_inquiries: id (bigint), customer_name, mobile, address, location,
// inquiry_type, description, followup_date, status, notes,
// created_by, created_by_name, assigned_to, assigned_name,
// created_at, updated_at

export interface AutoInquiry {
    id: number;
    customer_name: string;
    mobile?: string;
    address?: string;
    location?: string;
    inquiry_type?: string;
    description?: string;
    followup_date?: string;
    status?: string;
    notes?: string;
    created_by?: string;
    created_by_name?: string;
    assigned_to?: string;
    assigned_name?: string;
    created_at?: string;
    updated_at?: string;
}

export interface InquiryFormData {
    customer_name: string;
    mobile: string;
    address: string;
    location: string;
    inquiry_type: string;
    description: string;
    followup_date: string;
    assigned_to: string;
}

export const emptyInquiryForm: InquiryFormData = {
    customer_name: '', mobile: '', address: '', location: '',
    inquiry_type: 'CCTV', description: '', followup_date: '', assigned_to: '',
};

export const INQUIRY_TYPES = [
    'CCTV', 'Camera', 'Automation', 'Home Theater', 'Printer Repair',
    'Printer Service', 'Buy New Printer', 'Buy New Camera', 'Repair',
    'New Installation', 'Networking', 'Other',
];

export const INQUIRY_STATUSES = [
    'Open', 'In Progress', 'Pending - Customer Call', 'Pending - Quotation',
    'Pending - Customer Side', 'Site Visit Scheduled', 'Demo Scheduled',
    'Converted', 'Lost',
];

export const INQUIRY_STATUS_COLORS: Record<string, string> = {
    'Open': '#2563eb',
    'In Progress': '#d97706',
    'Pending - Customer Call': '#7c3aed',
    'Pending - Quotation': '#0369a1',
    'Pending - Customer Side': '#b45309',
    'Site Visit Scheduled': '#0891b2',
    'Demo Scheduled': '#9333ea',
    'Converted': '#059669',
    'Lost': '#6b7280',
};