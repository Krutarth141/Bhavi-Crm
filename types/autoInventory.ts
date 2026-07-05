// auto_inventory: id (bigint), brand, item_name, category,
//                 purchase_price, stock_qty, unit, gst_percent,
//                 selling_price, made_in, model_no, description,
//                 created_at, updated_at
// auto_inventory_log: id, inventory_id, type, qty, dealer_name,
//                     customer_name, invoice_no, price_per_unit,
//                     note, done_by, txn_date, created_at

export interface AutoInventoryItem {
    id: number;
    brand?: string;
    item_name: string;
    category?: string;
    purchase_price?: number;
    stock_qty?: number;
    unit?: string;
    gst_percent?: number;
    selling_price?: number;
    made_in?: string;
    model_no?: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface AutoInventoryLog {
    id: number;
    inventory_id: number;
    type: string; // 'purchase' | 'sale' | 'site_use' | 'adjustment'
    qty: number;
    dealer_name?: string;
    customer_name?: string;
    invoice_no?: string;
    price_per_unit?: number;
    note?: string;
    done_by?: string;
    txn_date?: string;
    created_at?: string;
}

export interface AutoInventoryForm {
    brand: string;
    item_name: string;
    category: string;
    purchase_price: string;
    stock_qty: string;
    unit: string;
    gst_percent: string;
    selling_price: string;
    model_no: string;
    description: string;
}

export const emptyAutoInventoryForm: AutoInventoryForm = {
    brand: '', item_name: '', category: '', purchase_price: '',
    stock_qty: '0', unit: 'pcs', gst_percent: '18',
    selling_price: '', model_no: '', description: '',
};

export const AUTO_CATEGORIES = ['CCTV', 'Gate Automation', 'Curtain Motor', 'Sensors', 'Cables', 'Power Supply', 'DVR/NVR', 'Other'];