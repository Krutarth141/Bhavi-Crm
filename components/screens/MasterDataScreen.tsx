'use client';

import { useState } from 'react';
import { MasterTabId, BrandForm, SubCategoryForm, ModelForm, emptyBrandForm, emptySubCategoryForm, emptyModelForm } from '@/types/masters';
import { useMasters } from '@/hooks/useMasters';
import MasterFormRow from './masters/MasterFormRow';
import MasterTable from './masters/MasterTable';

const tabs: { id: MasterTabId; label: string }[] = [
    { id: 'brands', label: '🏢 Brands' },
    { id: 'subcategories', label: '📋 Sub-Categories' },
    { id: 'models', label: '📱 Models' },
];

export default function MasterDataScreen() {
    const [activeTab, setActiveTab] = useState<MasterTabId>('brands');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Per-tab form state
    const [brandForm, setBrandForm] = useState<BrandForm>(emptyBrandForm);
    const [subCategoryForm, setSubCategoryForm] = useState<SubCategoryForm>(emptySubCategoryForm);
    const [modelForm, setModelForm] = useState<ModelForm>(emptyModelForm);

    const {
        brands, subcategories, models,
        loading, error,
        saveBrand, removeBrand,
        saveSubCategory, removeSubCategory,
        saveModel, removeModel,
    } = useMasters();

    // ── Reset ──────────────────────────────────────────────────────────────────

    const resetForm = () => {
        setBrandForm(emptyBrandForm);
        setSubCategoryForm(emptySubCategoryForm);
        setModelForm(emptyModelForm);
        setEditingId(null);
    };

    const handleTabChange = (tab: MasterTabId) => {
        setActiveTab(tab);
        resetForm();
    };

    // ── Edit populate ──────────────────────────────────────────────────────────

    const handleEdit = (item: any) => {
        setEditingId(item.id);
        if (activeTab === 'brands') {
            setBrandForm({ name: item.name });
        } else if (activeTab === 'subcategories') {
            setSubCategoryForm({ name: item.name, brand_id: item.brand_id || '' });
        } else if (activeTab === 'models') {
            setModelForm({
                model_no: item.model_no,
                model_name: item.model_name || '',
                brand_id: item.brand_id || '',
                subcategory_id: item.subcategory_id || '',
                sale_price: item.sale_price?.toString() || '',
                printer_type: item.printer_type || '',
                brochure_url: item.brochure_url || '',
            });
        }
    };

    // ── Save ───────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        try {
            if (activeTab === 'brands') {
                if (!brandForm.name.trim()) { alert('Brand name is required'); return; }
                await saveBrand(brandForm, editingId ?? undefined);
            } else if (activeTab === 'subcategories') {
                if (!subCategoryForm.name.trim()) { alert('Sub-category name is required'); return; }
                await saveSubCategory(subCategoryForm, editingId ?? undefined);
            } else if (activeTab === 'models') {
                if (!modelForm.model_no.trim()) { alert('Model No. is required'); return; }
                await saveModel(modelForm, editingId ?? undefined);
            }
            resetForm();
        } catch (err: any) {
            alert('Error: ' + (err.message || 'Save failed'));
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this item? This cannot be undone.')) return;
        try {
            if (activeTab === 'brands') await removeBrand(id);
            if (activeTab === 'subcategories') await removeSubCategory(id);
            if (activeTab === 'models') await removeModel(id);
        } catch (err: any) {
            alert('Error: ' + (err.message || 'Delete failed'));
        }
    };

    // ── Count ──────────────────────────────────────────────────────────────────

    const countMap: Record<MasterTabId, number> = {
        brands: brands.length,
        subcategories: subcategories.length,
        models: models.length,
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="screen-container">
            <h2>⚙️ Master Data Management</h2>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>
            )}

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: '18px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Form */}
            <div className="card">
                <h3 style={{ marginTop: 0 }}>
                    {editingId ? `✏️ Edit ${activeTab}` : `➕ Add New ${activeTab}`}
                </h3>
                <MasterFormRow
                    activeTab={activeTab}
                    editingId={editingId}
                    brands={brands}
                    subcategories={subcategories}
                    brandForm={brandForm} setBrandForm={setBrandForm}
                    subCategoryForm={subCategoryForm} setSubCategoryForm={setSubCategoryForm}
                    modelForm={modelForm} setModelForm={setModelForm}
                    onSave={handleSave}
                    onCancel={resetForm}
                />
            </div>

            {/* List */}
            <div className="card" style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0 }}>
                        📋 {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} List
                    </h3>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Total: <strong>{countMap[activeTab]}</strong>
                    </span>
                </div>

                {loading ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Loading...</p>
                ) : (
                    <MasterTable
                        activeTab={activeTab}
                        brands={brands}
                        subcategories={subcategories}
                        models={models}
                        editingId={editingId}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                )}
            </div>
        </div>
    );
}