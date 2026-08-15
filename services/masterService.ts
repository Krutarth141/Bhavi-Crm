import { supabase } from '@/lib/supabase';
import { Brand, SubCategory, Model, ProblemType, BrandForm, SubCategoryForm, ModelForm, ProblemTypeForm, ServiceGalleryPhoto } from '@/types/masters';

// ─── Helper: Supabase returns brand as array for joins, normalize it ──────────
const normBrand = (b: any): { name: string } | null => {
    if (!b) return null;
    if (Array.isArray(b)) return b[0] ?? null;
    return b;
};

// ─── Brands ───────────────────────────────────────────────────────────────────

export const fetchBrands = async (): Promise<Brand[]> => {
    let all: Brand[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
        const { data: page, error } = await supabase
            .from('brands')
            .select('id, name, created_at')
            .order('name')
            .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat((page || []) as Brand[]);
        if (!page || page.length < PAGE) break;
        from += PAGE;
    }
    return all;
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
    let data: any[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
        const { data: page, error } = await supabase
            .from('subcategories')
            .select('id, name, brand_id, created_at, brand:brands(name)')
            .order('name')
            .range(from, from + PAGE - 1);
        if (error) throw error;
        data = data.concat(page || []);
        if (!page || page.length < PAGE) break;
        from += PAGE;
    }
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
    let data: any[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
        const { data: page, error } = await supabase
            .from('models')
            .select('id, model_no, model_name, brand_id, subcategory_id, sale_price, printer_type, brochure_url, created_at, brand:brands(name), subcategory:subcategories(name)')
            .order('model_no')
            .range(from, from + PAGE - 1);
        if (error) throw error;
        data = data.concat(page || []);
        if (!page || page.length < PAGE) break;
        from += PAGE;
    }
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
    let data: any[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
        const { data: page, error } = await supabase
            .from('problem_types')
            .select('id, problem, brand_id, is_active, created_at, brand:brands(name)')
            .order('problem')
            .range(from, from + PAGE - 1);
        if (error) throw error;
        data = data.concat(page || []);
        if (!page || page.length < PAGE) break;
        from += PAGE;
    }
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

// ─── Edit (update) ────────────────────────────────────────────────────────────

export const updateSubCategory = async (id: string, form: SubCategoryForm): Promise<void> => {
    const { error } = await supabase
        .from('subcategories')
        .update({ name: form.name.trim(), brand_id: form.brand_id || null })
        .eq('id', id);
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
        })
        .eq('id', id);
    if (error) throw error;
};

export const updateProblemType = async (id: string, problem: string): Promise<void> => {
    const { error } = await supabase
        .from('problem_types')
        .update({ problem })
        .eq('id', id);
    if (error) throw error;
};

// ─── Pincodes (bulk import only — matches legacy app, no per-row CRUD) ────────

export const fetchPincodeCount = async (): Promise<number> => {
    const { count, error } = await supabase.from('pincodes').select('pincode', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
};

export const importPincodes = async (
    rows: { pincode: string; area: string; district: string; state: string }[],
    clearFirst: boolean
): Promise<number> => {
    if (clearFirst) {
        const { error } = await supabase.from('pincodes').delete().gte('pincode', '100000');
        if (error) throw error;
    }
    const BATCH = 500;
    let done = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error } = await supabase.from('pincodes').upsert(batch, { onConflict: 'pincode' });
        if (error) throw error;
        done += batch.length;
    }
    return done;
};

// ─── Service Gallery ───────────────────────────────────────────────────────────

export const fetchServiceGalleryPhotos = async (): Promise<ServiceGalleryPhoto[]> => {
    let all: ServiceGalleryPhoto[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
        const { data: page, error } = await supabase
            .from('service_gallery')
            .select('*')
            .order('service_id')
            .order('created_at', { ascending: true })
            .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(page || []);
        if (!page || page.length < PAGE) break;
        from += PAGE;
    }
    return all;
};

export const uploadServiceGalleryPhoto = async (
    serviceId: string, file: File, caption: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const ext = file.name.split('.').pop() || 'jpg';
        const fname = `svc_${serviceId}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('service-photos').upload(fname, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('service-photos').getPublicUrl(fname);
        const { error } = await supabase.from('service_gallery').insert([{
            service_id: serviceId, image_url: pub.publicUrl, caption: caption || null, created_at: new Date().toISOString(),
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};

export const deleteServiceGalleryPhoto = async (id: string): Promise<void> => {
    const { error } = await supabase.from('service_gallery').delete().eq('id', id);
    if (error) throw error;
};