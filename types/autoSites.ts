// auto_sites: id (bigint), site_name, client_name, mobile, address,
//             created_by, created_at
// auto_site_items: id, site_id, item_name, qty, unit_price, total_price,
//                  purchase_price, note, unit, gst_percent,
//                  delivery_status, delivered_qty, delivered_date,
//                  delivered_by, delivery_note, created_at
// auto_site_visits: id, site_id, visit_date, visit_time, work_done,
//                   material_delivered, created_by, created_by_name,
//                   material_items (jsonb), material_total,
//                   delivery_details, photos (jsonb), created_at

export interface AutoSite {
    id: number;
    site_name: string;
    client_name: string;
    mobile?: string;
    address?: string;
    created_by?: string;
    created_at?: string;
}

export interface AutoSiteItem {
    id: number;
    site_id: number;
    item_name: string;
    qty?: number;
    unit_price?: number;
    total_price?: number;
    purchase_price?: number;
    note?: string;
    unit?: string;
    gst_percent?: number;
    delivery_status?: string;
    delivered_qty?: number;
    delivered_date?: string;
    delivered_by?: string;
    delivery_note?: string;
    created_at?: string;
}

export interface AutoSiteVisit {
    id: number;
    site_id: number;
    visit_date?: string;
    visit_time?: string;
    work_done?: string;
    material_delivered?: string;
    created_by?: string;
    created_by_name?: string;
    material_items?: any[];
    material_total?: number;
    delivery_details?: string;
    photos?: any[];
    created_at?: string;
}

export interface SiteFormData {
    site_name: string;
    client_name: string;
    mobile: string;
    address: string;
}

export const emptySiteForm: SiteFormData = {
    site_name: '', client_name: '', mobile: '', address: '',
};

export interface AutoSitePayment {
    id: number;
    site_id: number;
    amount: number;
    payment_mode?: string;
    payment_date?: string;
    reference_no?: string;
    note?: string;
    created_by?: string;
    created_at?: string;
}

export interface SiteItemForm {
    item_name: string;
    qty: string;
    unit: string;
    purchase_price: string;
    unit_price: string;
    gst_percent: string;
    note: string;
}

export const emptySiteItemForm: SiteItemForm = {
    item_name: '', qty: '1', unit: 'pcs', purchase_price: '0', unit_price: '0', gst_percent: '0', note: '',
};

export const SERVICE_CHARGE_TYPES = ['Professional Charges', 'Configuration Charges', 'Installation Charges', 'Service Charges', 'AMC Charges', 'Labour Charges', 'Commissioning Charges', 'Other Charges'];

export interface PaymentForm {
    amount: string;
    payment_mode: string;
    payment_date: string;
    reference_no: string;
    note: string;
}

export interface AutoSiteDispatch {
    id: number;
    site_id: number;
    dispatch_date?: string;
    delivery_mode?: string;
    delivery_detail?: string;
    receiver_name?: string;
    items?: string; // JSON string of dispatched item summaries
    dc_number?: string;
    notes?: string;
    created_by?: string;
    created_at?: string;
}

export const DISPATCH_MODES = ['By Hand', 'Courier', 'Porter', 'Company Vehicle'];

export interface SiteContact {
    id: number;
    site_id: number;
    agency: string;
    contact_name: string;
    mobile: string;
    created_at?: string;
}

export interface ContactForm {
    agency: string;
    contact_name: string;
    mobile: string;
}

export const emptyContactForm: ContactForm = { agency: '', contact_name: '', mobile: '' };

export const CONTACT_AGENCIES = ['Mistry', 'Electrician', 'Plumber', 'POP', 'Painter', 'Automation', 'CCTV', 'Network', 'AC Technician', 'Carpenter'];

export const emptyPaymentForm = (): PaymentForm => ({
    amount: '', payment_mode: '', payment_date: new Date().toISOString().slice(0, 10), reference_no: '', note: '',
});

export const PAYMENT_MODES = ['Cash', 'NEFT', 'IMPS', 'Cheque', 'UPI'];