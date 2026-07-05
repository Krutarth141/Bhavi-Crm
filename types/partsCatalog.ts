// Exact Supabase schema:
// id (uuid), part_name, item_code, category, selling_price,
// stock_qty, compatible_models, notes, created_at, updated_at

export interface CatalogPart {
    id: string;
    part_name: string;
    item_code?: string;
    category?: string;
    selling_price?: number;
    stock_qty?: number;
    compatible_models?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

export interface PartsCatalogFilter {
    searchTerm?: string;
    category?: string;
}