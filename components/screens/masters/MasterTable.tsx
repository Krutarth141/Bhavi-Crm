'use client';

import { MasterTabId, Brand, SubCategory, Model } from '@/types/masters';

interface Props {
    activeTab: MasterTabId;
    brands: Brand[];
    subcategories: SubCategory[];
    models: Model[];
    editingId: string | null;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
}

const EmptyState = () => (
    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
        No items added yet
    </p>
);

const ActionBtns = ({ item, onEdit, onDelete }: { item: any; onEdit: any; onDelete: any }) => (
    <td>
        <button className="btn btn-sm btn-secondary" onClick={() => onEdit(item)} style={{ marginRight: 6 }}>
            ✏️ Edit
        </button>
        <button className="btn btn-sm btn-danger" onClick={() => onDelete(item.id)}>
            🗑️ Delete
        </button>
    </td>
);

export default function MasterTable({ activeTab, brands, subcategories, models, editingId, onEdit, onDelete }: Props) {
    const highlight = (id: string) => editingId === id ? { background: 'var(--color-highlight, #fffbe6)' } : {};

    if (activeTab === 'brands') {
        if (!brands.length) return <EmptyState />;
        return (
            <table>
                <thead>
                    <tr><th>#</th><th>Brand Name</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    {brands.map((item, i) => (
                        <tr key={item.id} style={highlight(item.id)}>
                            <td>{i + 1}</td>
                            <td><strong>{item.name}</strong></td>
                            <ActionBtns item={item} onEdit={onEdit} onDelete={onDelete} />
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    if (activeTab === 'subcategories') {
        if (!subcategories.length) return <EmptyState />;
        return (
            <table>
                <thead>
                    <tr><th>#</th><th>Sub-Category</th><th>Brand</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    {subcategories.map((item, i) => (
                        <tr key={item.id} style={highlight(item.id)}>
                            <td>{i + 1}</td>
                            <td><strong>{item.name}</strong></td>
                            <td>{item.brand?.name || '—'}</td>
                            <ActionBtns item={item} onEdit={onEdit} onDelete={onDelete} />
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    if (activeTab === 'models') {
        if (!models.length) return <EmptyState />;
        return (
            <table>
                <thead>
                    <tr>
                        <th>#</th><th>Model No.</th><th>Model Name</th>
                        <th>Brand</th><th>Sub-Category</th>
                        <th>Sale Price</th><th>Printer Type</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {models.map((item, i) => (
                        <tr key={item.id} style={highlight(item.id)}>
                            <td>{i + 1}</td>
                            <td><strong>{item.model_no}</strong></td>
                            <td>{item.model_name || '—'}</td>
                            <td>{item.brand?.name || '—'}</td>
                            <td>{item.subcategory?.name || '—'}</td>
                            <td>{item.sale_price ? `₹${item.sale_price}` : '—'}</td>
                            <td>{item.printer_type || '—'}</td>
                            <ActionBtns item={item} onEdit={onEdit} onDelete={onDelete} />
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    return null;
}