// Sourced from the real `inventory` table — there is no separate parts_catalog table.
export interface CatalogPart {
    code: string;
    name: string;
    model: string;
    stock: number;
    wstock: number;
    price: number;
    min: number;
}

export type CatalogStockFilter = '' | 'in' | 'low' | 'out';

export interface PartsCatalogFilter {
    searchTerm?: string;
    category?: string;
}