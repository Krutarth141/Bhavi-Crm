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
    made_in: string;
    item_name: string;
    category: string;
    purchase_price: string;
    stock_qty: string;
    unit: string;
    gst_percent: string;
    selling_price: string;
    model_no: string;
    description: string;
    dealer: string;         // add-mode only: opening-stock supplier
    purchase_date: string;  // add-mode only: opening-stock date
}

export const emptyAutoInventoryForm = (): AutoInventoryForm => ({
    brand: '', made_in: '', item_name: '', category: '', purchase_price: '',
    stock_qty: '0', unit: 'pcs', gst_percent: '0',
    selling_price: '', model_no: '', description: '',
    dealer: '', purchase_date: new Date().toISOString().slice(0, 10),
});

export interface BulkStockRow {
    itemId: number | null;   // null → new item, created automatically on save
    itemName: string;
    unit: string;
    qty: string;
    price: string;           // purchase price / unit
    sellPrice: string;       // selling price / unit
    gstPercent: string;
    note: string;
}

export const emptyBulkStockRow = (): BulkStockRow => ({
    itemId: null, itemName: '', unit: 'pcs', qty: '1', price: '0', sellPrice: '0', gstPercent: '0', note: '',
});

export interface ImportInventoryRow {
    brand?: string;
    made_in?: string;
    model_no?: string;
    item_name: string;
    category?: string;
    description?: string;
    unit: string;
    purchase_price: number;
    gst_percent: number;
    selling_price: number;
    stock_qty: number;
}

export const AUTO_UNITS = ['pcs', 'Each', 'Pair', 'Mtr', 'Rft', 'Roll', 'Set', 'Box', 'Bag', 'Kg', 'Ltr', 'Nos', 'Job', 'Yr'];

export type StockTxnType = 'in' | 'out' | 'sell';

export const AUTO_CATEGORIES = ['CCTV', 'Gate Automation', 'Curtain Motor', 'Sensors', 'Cables', 'Power Supply', 'DVR/NVR', 'Other'];