export interface InventoryItem {
    id: string;
    item_code: string;
    item_name: string;
    category: string | null;
    qty_in_stock: number;
    min_stock: number;
    unit_price: number;
    purchase_price?: number;
    warranty_qty?: number;
    brand_id: string | null;
    description: string | null;
    part_code: string | null;
    gst_pct: number | null;
    created_at: string;
    updated_at: string;
}

export interface StockMovement {
    id: string;
    inventory_id: string;
    movement_type: 'in' | 'out' | 'adjust' | 'sell';
    quantity: number;
    note: string | null;
    supplier?: string | null;
    invoice?: string | null;
    customer?: string | null;
    sell_price?: number | null;
    created_at: string;
    created_by: string | null;
}

export interface TransactionData {
    quantity: number;
    date: string;
    note: string;
    supplier: string;
    invoice: string;
    customer: string;
    sell_price: number;
}

export interface InventoryPurchase {
    id: string;
    purchase_date: string;
    part_code: string;
    part_name: string;
    supplier: string;
    qty: number;
    unit_cost: number;
    invoice_no: string;
    total_cost?: number;
    note?: string | null;
    added_by?: string;
    created_at?: string;
}

export interface InventorySale {
    id: string;
    sale_date: string;
    part_code: string;
    part_name: string;
    sale_type: 'call' | 'dealer' | 'customer';
    customer_name?: string;
    mobile?: string | null;
    reference?: string;
    qty: number;
    unit_price: number;
    total_amount?: number;
    note?: string | null;
    added_by?: string;
    created_at?: string;
}

export interface InventoryLogEntry {
    id: string;
    inventory_id: string;
    type: 'in' | 'out' | 'sell';
    qty: number;
    note?: string | null;
    supplier?: string | null;
    invoice_no?: string | null;
    customer_name?: string | null;
    price_per_unit?: number | null;
    done_by?: string | null;
    txn_date?: string | null;
    created_at?: string;
}