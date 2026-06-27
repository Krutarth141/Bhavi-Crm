// ─── Exact Supabase schema ────────────────────────────────────────────────────
// brands:        id (uuid), name (text), created_at
// subcategories: id (uuid), brand_id (uuid), name (text), created_at
// models:        id (uuid), brand_id (uuid), subcategory_id (uuid),
//                model_no (text), model_name (text), sale_price, printer_type,
//                brochure_url, created_at

export interface Brand {
    id: string;           // uuid
    name: string;
    created_at?: string;
}

export interface SubCategory {
    id: string;           // uuid
    brand_id?: string;    // uuid — links to brands
    name: string;
    created_at?: string;
    brand?: { name: string };
}

export interface Model {
    id: string;           // uuid
    brand_id?: string;    // uuid
    subcategory_id?: string; // uuid
    model_no: string;     // primary identifier
    model_name?: string;  // display name
    sale_price?: number;
    printer_type?: string;
    brochure_url?: string;
    created_at?: string;
    brand?: { name: string };
    subcategory?: { name: string };
}

export type MasterTabId = 'brands' | 'subcategories' | 'models';

// ─── Form states ──────────────────────────────────────────────────────────────

export interface BrandForm {
    name: string;
}

export interface SubCategoryForm {
    name: string;
    brand_id: string;
}

export interface ModelForm {
    model_no: string;
    model_name: string;
    brand_id: string;
    subcategory_id: string;
    sale_price: string;
    printer_type: string;
    brochure_url: string;
}

export const emptyBrandForm: BrandForm = { name: '' };
export const emptySubCategoryForm: SubCategoryForm = { name: '', brand_id: '' };
export const emptyModelForm: ModelForm = {
    model_no: '', model_name: '', brand_id: '',
    subcategory_id: '', sale_price: '', printer_type: '', brochure_url: '',
};