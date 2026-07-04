import { supabase } from '@/lib/supabase';
import { Brand, SubCategory, Model, ProblemType, BrandForm, SubCategoryForm, ModelForm, ProblemTypeForm } from '@/types/masters';

// ─── Helper: Supabase returns brand as array for joins, normalize it ──────────
const normBrand = (b: any): { name: string } | null => {
    if (!b) return null;
    if (Array.isArray(b)) return b[0] ?? null;
    return b;
};

// ─── Brands ───────────────────────────────────────────────────────────────────

export const fetchBrands = async (): Promise<Brand[]> => {
    const { data, error } = await supabase
        .from('brands')
        .select('id, name, created_at')
        .order('name');
    if (error) throw error;
    return (data || []) as Brand[];
};

export const addBrand = async (form: BrandForm): Promise<void> => {
    const { error } = await supabase
        .from('brands')
        .insert([{ name: form.name.trim() }]);
    if (error) throw error;
};

export const deleteBrand = async (id: string): Promise<void> => {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
};

// ─── Sub-Categories ───────────────────────────────────────────────────────────

export const fetchSubCategories = async (): Promise<SubCategory[]> => {
    const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, brand_id, created_at, brand:brands(name)')
        .order('name');
    if (error) throw error;
    return (data || []).map((item: any): SubCategory => ({
        ...item,
        brand: normBrand(item.brand),
    }));
};

export const addSubCategory = async (form: SubCategoryForm): Promise<void> => {
    if (!form.brand_id) throw new Error('Please select a brand');
    const { error } = await supabase
        .from('subcategories')
        .insert([{ name: form.name.trim(), brand_id: form.brand_id }]);
    if (error) throw error;
};

export const deleteSubCategory = async (id: string): Promise<void> => {
    const { error } = await supabase.from('subcategories').delete().eq('id', id);
    if (error) throw error;
};

// ─── Models ───────────────────────────────────────────────────────────────────

export const fetchModels = async (): Promise<Model[]> => {
    const { data, error } = await supabase
        .from('models')
        .select('id, model_no, model_name, brand_id, subcategory_id, sale_price, printer_type, brochure_url, created_at, brand:brands(name), subcategory:subcategories(name)')
        .order('model_no');
    if (error) throw error;
    return (data || []).map((item: any): Model => ({
        ...item,
        brand: normBrand(item.brand),
        subcategory: normBrand(item.subcategory),
    }));
};

export const addModel = async (form: ModelForm): Promise<void> => {
    const { error } = await supabase
        .from('models')
        .insert([{
            model_no: form.model_no.trim(),
            model_name: form.model_name.trim() || null,
            brand_id: form.brand_id || null,
            subcategory_id: form.subcategory_id || null,
            sale_price: form.sale_price ? Number(form.sale_price) : null,
            printer_type: form.printer_type || null,
        }]);
    if (error) throw error;
};

export const deleteModel = async (id: string): Promise<void> => {
    const { error } = await supabase.from('models').delete().eq('id', id);
    if (error) throw error;
};

// ─── Problem Types ────────────────────────────────────────────────────────────

export const fetchProblemTypes = async (): Promise<ProblemType[]> => {
    const { data, error } = await supabase
        .from('problem_types')
        .select('id, problem, brand_id, is_active, created_at, brand:brands(name)')
        .order('problem');
    if (error) throw error;
    return (data || []).map((item: any): ProblemType => ({
        ...item,
        brand: normBrand(item.brand),
    }));
};

export const addProblemType = async (form: ProblemTypeForm): Promise<void> => {
    const { error } = await supabase
        .from('problem_types')
        .insert([{
            problem: form.problem.trim(),
            brand_id: form.brand_id || null,
            is_active: true,
        }]);
    if (error) throw error;
};

export const toggleProblemType = async (id: string, is_active: boolean): Promise<void> => {
    const { error } = await supabase
        .from('problem_types')
        .update({ is_active })
        .eq('id', id);
    if (error) throw error;
};

export const deleteProblemType = async (id: string): Promise<void> => {
    const { error } = await supabase.from('problem_types').delete().eq('id', id);
    if (error) throw error;
};

// ─── Import helpers ───────────────────────────────────────────────────────────

export const importBrands = async (rows: { name: string }[]): Promise<number> => {
    let count = 0;
    for (const row of rows) {
        if (!row.name?.trim()) continue;
        try { await addBrand({ name: row.name.trim() }); count++; } catch (_) { }
    }
    return count;
};

export const importSubCategories = async (
    rows: { brand: string; name: string }[],
    brands: Brand[]
): Promise<number> => {
    let count = 0;
    for (const row of rows) {
        if (!row.name?.trim()) continue;
        const brand = brands.find(b => b.name.toLowerCase() === (row.brand || '').toLowerCase());
        try {
            const { error } = await supabase
                .from('subcategories')
                .insert([{ name: row.name.trim(), brand_id: brand?.id || null }]);
            if (!error) count++;
        } catch (_) { }
    }
    return count;
};

export const importModels = async (
    rows: { model_no: string; model_name?: string; brand?: string; sale_price?: number }[],
    brands: Brand[]
): Promise<number> => {
    let count = 0;
    for (const row of rows) {
        if (!row.model_no?.trim()) continue;
        const brand = brands.find(b => b.name.toLowerCase() === (row.brand || '').toLowerCase());
        try {
            const { error } = await supabase
                .from('models')
                .insert([{
                    model_no: row.model_no.trim(),
                    model_name: row.model_name?.trim() || null,
                    brand_id: brand?.id || null,
                    sale_price: row.sale_price ? Number(row.sale_price) : null,
                }]);
            if (!error) count++;
        } catch (_) { }
    }
    return count;
};