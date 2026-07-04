// ─── Exact Supabase schema ─────────────────────────────────────────────────
// brands:        id (uuid), name (text), created_at
// subcategories: id (uuid), brand_id (uuid), name (text), created_at
// models:        id (uuid), brand_id (uuid), subcategory_id (uuid),
//                model_no (text), model_name (text), sale_price, printer_type,
//                brochure_url, created_at
// problem_types: id (uuid), brand_id (uuid), problem (text), is_active (bool), created_at

export interface Brand {
    id: string;
    name: string;
    created_at?: string;
}

export interface SubCategory {
    id: string;
    brand_id?: string;
    name: string;
    created_at?: string;
    brand?: { name: string } | null;
}

export interface Model {
    id: string;
    brand_id?: string;
    subcategory_id?: string;
    model_no: string;
    model_name?: string;
    sale_price?: number;
    printer_type?: string;
    brochure_url?: string;
    created_at?: string;
    brand?: { name: string } | null;
    subcategory?: { name: string } | null;
}

export interface ProblemType {
    id: string;
    brand_id?: string;
    problem: string;
    is_active: boolean;
    created_at?: string;
    brand?: { name: string } | null;
}

export type MasterTabId = 'brands' | 'subcategories' | 'models' | 'problems' | 'inventory';

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
}

export interface ProblemTypeForm {
    problem: string;
    brand_id: string;
    is_active: boolean;
}

export const emptyBrandForm: BrandForm = { name: '' };
export const emptySubCategoryForm: SubCategoryForm = { name: '', brand_id: '' };
export const emptyModelForm: ModelForm = {
    model_no: '', model_name: '', brand_id: '',
    subcategory_id: '', sale_price: '', printer_type: '',
};
export const emptyProblemTypeForm: ProblemTypeForm = {
    problem: '', brand_id: '', is_active: true,
};