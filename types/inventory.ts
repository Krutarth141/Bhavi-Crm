export interface InventoryItem {
    id: string;
    item_code: string;
    item_name: string;
    category: string | null;
    qty_in_stock: number;
    min_stock: number;
    unit_price: number;
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
