import { useState, useEffect, useCallback } from 'react';
import { Brand, SubCategory, Model, BrandForm, SubCategoryForm, ModelForm } from '@/types/masters';
import {
    fetchBrands, addBrand, updateBrand, deleteBrand,
    fetchSubCategories, addSubCategory, updateSubCategory, deleteSubCategory,
    fetchModels, addModel, updateModel, deleteModel,
} from '@/services/masterService';

export const useMasters = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [subcategories, setSubCategories] = useState<SubCategory[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [b, s, m] = await Promise.all([
                fetchBrands(),
                fetchSubCategories(),
                fetchModels(),
            ]);
            setBrands(b);
            setSubCategories(s);
            setModels(m);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch master data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ─── Brand actions ──────────────────────────────────────────────────────────
    const saveBrand = async (form: BrandForm, id?: string) => {
        if (id) await updateBrand(id, form);
        else await addBrand(form);
        await fetchAll();
    };

    const removeBrand = async (id: string) => {
        await deleteBrand(id);
        await fetchAll();
    };

    // ─── SubCategory actions ────────────────────────────────────────────────────
    const saveSubCategory = async (form: SubCategoryForm, id?: string) => {
        if (id) await updateSubCategory(id, form);
        else await addSubCategory(form);
        await fetchAll();
    };

    const removeSubCategory = async (id: string) => {
        await deleteSubCategory(id);
        await fetchAll();
    };

    // ─── Model actions ──────────────────────────────────────────────────────────
    const saveModel = async (form: ModelForm, id?: string) => {
        if (id) await updateModel(id, form);
        else await addModel(form);
        await fetchAll();
    };

    const removeModel = async (id: string) => {
        await deleteModel(id);
        await fetchAll();
    };

    return {
        brands, subcategories, models,
        loading, error, fetchAll,
        saveBrand, removeBrand,
        saveSubCategory, removeSubCategory,
        saveModel, removeModel,
    };
};