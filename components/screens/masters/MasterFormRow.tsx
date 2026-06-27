'use client';

import { MasterTabId, Brand, SubCategory, BrandForm, SubCategoryForm, ModelForm } from '@/types/masters';

interface Props {
    activeTab: MasterTabId;
    editingId: string | null;
    brands: Brand[];
    subcategories: SubCategory[];
    // Brand form
    brandForm: BrandForm;
    setBrandForm: (f: BrandForm) => void;
    // SubCategory form
    subCategoryForm: SubCategoryForm;
    setSubCategoryForm: (f: SubCategoryForm) => void;
    // Model form
    modelForm: ModelForm;
    setModelForm: (f: ModelForm) => void;
    // Actions
    onSave: () => void;
    onCancel: () => void;
}

export default function MasterFormRow({
    activeTab, editingId,
    brands, subcategories,
    brandForm, setBrandForm,
    subCategoryForm, setSubCategoryForm,
    modelForm, setModelForm,
    onSave, onCancel,
}: Props) {
    const isEditing = editingId !== null;
    const btnLabel = isEditing ? '💾 Update' : '➕ Add';

    return (
        <div className="master-add-row">

            {/* ── Brands ── */}
            {activeTab === 'brands' && (
                <input
                    type="text"
                    placeholder="Brand Name *"
                    value={brandForm.name}
                    onChange={e => setBrandForm({ name: e.target.value })}
                />
            )}

            {/* ── Sub-Categories ── */}
            {activeTab === 'subcategories' && (
                <>
                    <input
                        type="text"
                        placeholder="Sub-Category Name *"
                        value={subCategoryForm.name}
                        onChange={e => setSubCategoryForm({ ...subCategoryForm, name: e.target.value })}
                    />
                    <select
                        value={subCategoryForm.brand_id}
                        onChange={e => setSubCategoryForm({ ...subCategoryForm, brand_id: e.target.value })}
                    >
                        <option value="">Select Brand (optional)</option>
                        {brands.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </>
            )}

            {/* ── Models ── */}
            {activeTab === 'models' && (
                <>
                    <input
                        type="text"
                        placeholder="Model No. *"
                        value={modelForm.model_no}
                        onChange={e => setModelForm({ ...modelForm, model_no: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Model Name"
                        value={modelForm.model_name}
                        onChange={e => setModelForm({ ...modelForm, model_name: e.target.value })}
                    />
                    <select
                        value={modelForm.brand_id}
                        onChange={e => setModelForm({ ...modelForm, brand_id: e.target.value })}
                    >
                        <option value="">Select Brand</option>
                        {brands.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                    <select
                        value={modelForm.subcategory_id}
                        onChange={e => setModelForm({ ...modelForm, subcategory_id: e.target.value })}
                    >
                        <option value="">Select Sub-Category</option>
                        {subcategories.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        placeholder="Sale Price (₹)"
                        value={modelForm.sale_price}
                        onChange={e => setModelForm({ ...modelForm, sale_price: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Printer Type"
                        value={modelForm.printer_type}
                        onChange={e => setModelForm({ ...modelForm, printer_type: e.target.value })}
                    />
                </>
            )}

            <button className="btn btn-primary" onClick={onSave}>{btnLabel}</button>
            {isEditing && (
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            )}
        </div>
    );
}