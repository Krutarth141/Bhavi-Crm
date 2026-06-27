import { supabase } from '@/lib/supabase';
import { Brand, SubCategory, Model, BrandForm, SubCategoryForm, ModelForm } from '@/types/masters';

// ─── Brands ───────────────────────────────────────────────────────────────────

export const fetchBrands = async (): Promise<Brand[]> => {
    const { data, error } = await supabase
        .from('brands')
        .select('id, name, created_at')
        .order('name');
    if (error) throw error;
    return data || [];
};

export const addBrand = async (form: BrandForm): Promise<void> => {
    const { error } = await supabase
        .from('brands')
        .insert([{ name: form.name.trim() }]);
    if (error) throw error;
};

export const updateBrand = async (id: string, form: BrandForm): Promise<void> => {
    const { error } = await supabase
        .from('brands')
        .update({ name: form.name.trim() })
        .eq('id', id);
    if (error) throw error;
};

export const deleteBrand = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// ─── Sub-Categories ───────────────────────────────────────────────────────────
// subcategories.brand_id → brands.id

export const fetchSubCategories = async (): Promise<SubCategory[]> => {
    const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, brand_id, created_at, brand:brands(name)')
        .order('name');
    if (error) throw error;
    return (data || []) as unknown as SubCategory[];
};

export const addSubCategory = async (form: SubCategoryForm): Promise<void> => {
    const { error } = await supabase
        .from('subcategories')
        .insert([{
            name: form.name.trim(),
            brand_id: form.brand_id || null,
        }]);
    if (error) throw error;
};

export const updateSubCategory = async (id: string, form: SubCategoryForm): Promise<void> => {
    const { error } = await supabase
        .from('subcategories')
        .update({
            name: form.name.trim(),
            brand_id: form.brand_id || null,
        })
        .eq('id', id);
    if (error) throw error;
};

export const deleteSubCategory = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// ─── Models ───────────────────────────────────────────────────────────────────
// models.brand_id → brands.id
// models.subcategory_id → subcategories.id

export const fetchModels = async (): Promise<Model[]> => {
    const { data, error } = await supabase
        .from('models')
        .select('id, model_no, model_name, brand_id, subcategory_id, sale_price, printer_type, brochure_url, created_at, brand:brands(name), subcategory:subcategories(name)')
        .order('model_no')
        .returns<Model[]>();
    if (error) throw error;
    return data || [];
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
            brochure_url: form.brochure_url || null,
        }]);
    if (error) throw error;
};

export const updateModel = async (id: string, form: ModelForm): Promise<void> => {
    const { error } = await supabase
        .from('models')
        .update({
            model_no: form.model_no.trim(),
            model_name: form.model_name.trim() || null,
            brand_id: form.brand_id || null,
            subcategory_id: form.subcategory_id || null,
            sale_price: form.sale_price ? Number(form.sale_price) : null,
            printer_type: form.printer_type || null,
            brochure_url: form.brochure_url || null,
        })
        .eq('id', id);
    if (error) throw error;
};

export const deleteModel = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', id);
    if (error) throw error;
};