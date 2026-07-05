// auto_inquiries: id (bigint), customer_name, mobile, address,
// inquiry_type, description, followup_date, status, notes,
// created_by, created_by_name, assigned_to, assigned_name,
// created_at, updated_at

export interface AutoInquiry {
    id: number;
    customer_name: string;
    mobile?: string;
    address?: string;
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
    inquiry_type: string;
    description: string;
    followup_date: string;
    notes: string;
}

export const emptyInquiryForm: InquiryFormData = {
    customer_name: '', mobile: '', address: '',
    inquiry_type: '', description: '', followup_date: '', notes: '',
};

export const INQUIRY_TYPES = ['CCTV', 'Gate Automation', 'Curtain Motor', 'Audio/Video', 'Home Automation', 'Other'];
export const INQUIRY_STATUSES = ['open', 'followup', 'converted', 'closed', 'cancelled'];