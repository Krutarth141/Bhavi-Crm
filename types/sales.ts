// sales_orders: id (uuid), order_no, customer_name, customer_mobile,
// customer_address, items (jsonb), subtotal, gst_amount, total_amount,
// status, payment_method, payment_reference, payment_date,
// courier_name, awb_number, dispatch_date

export interface SalesOrder {
    id: string;
    order_no?: string;
    customer_name: string;
    customer_mobile?: string;
    customer_address?: string;
    items?: any[];
    subtotal?: number;
    gst_amount?: number;
    total_amount?: number;
    status?: string;
    payment_method?: string;
    payment_reference?: string;
    payment_date?: string;
    courier_name?: string;
    awb_number?: string;
    dispatch_date?: string;
    created_at?: string;
}

export const SALES_STATUSES = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
export const PAYMENT_METHODS = ['Cash', 'UPI', 'NEFT', 'Cheque', 'Card', 'COD'];