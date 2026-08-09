export interface ReorderItem {
    id: string;
    item_name?: string;
    part_code?: string | null;
    category?: string | null;
    qty_in_stock: number;
    min_stock: number;
}