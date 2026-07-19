export interface SalesOrderItem {
    product_id?: string;
    name: string;
    price: number;
    gst_percent?: number;
    qty: number;
}

export type SalesStatus = 'inquiry' | 'quoted' | 'confirmed' | 'paid' | 'dispatched' | 'done';

export interface SalesOrder {
    id: string;
    order_no?: string;
    customer_name: string;
    customer_mobile?: string;
    customer_address?: string;
    items?: SalesOrderItem[];
    subtotal?: number;
    gst_amount?: number;
    total_amount?: number;
    status?: SalesStatus;
    notes?: string;
    payment_method?: string;
    payment_reference?: string;
    payment_date?: string;
    courier_name?: string;
    awb_number?: string;
    dispatch_date?: string;
    tracking_url?: string;
    tracking_info?: string;
    delivery_date?: string;
    delivery_note?: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
}

export interface SalesProduct {
    id: string;
    name: string;
    model?: string;
    category?: string;
    description?: string;
    features?: string[];
    specifications?: Record<string, string>;
    price: number;
    gst_percent?: number;
    stock_status?: 'available' | 'out_of_stock';
    image_url?: string;
    is_active?: boolean;
}

export const SALES_STATUSES: { id: SalesStatus; label: string; color: string }[] = [
    { id: 'inquiry', label: 'Inquiry', color: '#f59e0b' },
    { id: 'quoted', label: 'Quoted', color: '#3b82f6' },
    { id: 'confirmed', label: 'Confirmed', color: '#8b5cf6' },
    { id: 'paid', label: 'Paid', color: '#10b981' },
    { id: 'dispatched', label: 'Dispatched', color: '#0ea5e9' },
    { id: 'done', label: 'Done', color: '#9ca3af' },
];

export const PAYMENT_METHODS = ['UPI', 'Bank Transfer', 'Cash', 'Cheque'];

// Ported from HTML's BHAVI_PAYMENT constant (index.html:23035) — the
// business's own real bank details, already present in the existing repo.
export const BHAVI_PAYMENT = {
    name: 'BHAVI ELECTRONICS',
    bank: 'HDFC BANK',
    account: '50200020274632',
    type: 'Current Account',
    branch: 'Bopal, Ahmedabad',
    ifsc: 'HDFC0000305',
    gstin: '24AAOPJ7528C2ZQ',
    pan: 'AAOPJ7528C',
};

export const genOrderNo = () => 'BE-' + Math.random().toString(36).slice(2, 8).toUpperCase();

export const calcGstFromInclusive = (price: number, gstPct: number) => price - (price * 100) / (100 + gstPct);