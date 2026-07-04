import { useState, useEffect, useCallback } from 'react';
import { Brand, SubCategory, Model, ProblemType, BrandForm, SubCategoryForm, ModelForm, ProblemTypeForm } from '@/types/masters';
import {
    fetchBrands, addBrand, deleteBrand,
    fetchSubCategories, addSubCategory, deleteSubCategory,
    fetchModels, addModel, deleteModel,
    fetchProblemTypes, addProblemType, toggleProblemType, deleteProblemType,
} from '@/services/masterService';

export const useMasters = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [subcategories, setSubCategories] = useState<SubCategory[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [problemTypes, setProblemTypes] = useState<ProblemType[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [b, s, m, p] = await Promise.all([
                fetchBrands(),
                fetchSubCategories(),
                fetchModels(),
                fetchProblemTypes(),
            ]);
            setBrands(b);
            setSubCategories(s);
            setModels(m);
            setProblemTypes(p);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch master data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Brand actions ───────────────────────────────────────────────────────────
    const saveBrand = async (form: BrandForm) => {
        await addBrand(form);
        await fetchAll();
    };
    const removeBrand = async (id: string) => {
        await deleteBrand(id);
        await fetchAll();
    };

    // ── SubCategory actions ─────────────────────────────────────────────────────
    const saveSubCategory = async (form: SubCategoryForm) => {
        await addSubCategory(form);
        await fetchAll();
    };
    const removeSubCategory = async (id: string) => {
        await deleteSubCategory(id);
        await fetchAll();
    };

    // ── Model actions ───────────────────────────────────────────────────────────
    const saveModel = async (form: ModelForm) => {
        await addModel(form);
        await fetchAll();
    };
    const removeModel = async (id: string) => {
        await deleteModel(id);
        await fetchAll();
    };

    // ── Problem Type actions ────────────────────────────────────────────────────
    const saveProblemType = async (form: ProblemTypeForm) => {
        await addProblemType(form);
        await fetchAll();
    };
    const toggleProblem = async (id: string, is_active: boolean) => {
        await toggleProblemType(id, is_active);
        await fetchAll();
    };
    const removeProblemType = async (id: string) => {
        await deleteProblemType(id);
        await fetchAll();
    };

    return {
        brands, subcategories, models, problemTypes,
        loading, error, fetchAll,
        saveBrand, removeBrand,
        saveSubCategory, removeSubCategory,
        saveModel, removeModel,
        saveProblemType, toggleProblem, removeProblemType,
    };
};