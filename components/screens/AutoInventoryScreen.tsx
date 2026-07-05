'use client';

import { useState } from 'react';
import { useAutoInventory } from '@/hooks/useAutoInventory';
import Modal from '@/components/Modal';
import { AutoInventoryForm, emptyAutoInventoryForm, AUTO_CATEGORIES, AutoInventoryItem } from '@/types/autoInventory';

const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const, fontFamily: 'inherit' };

export default function AutoInventoryScreen() {
    const { items, loading, error, categories, lowStock, totalValue, add } = useAutoInventory();
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [form, setForm] = useState<AutoInventoryForm>(emptyAutoInventoryForm);

    const filtered: AutoInventoryItem[] = items.filter(i => {
        const q = search.toLowerCase();
        const matchSearch = !search.trim() || i.item_name?.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q) || i.model_no?.toLowerCase().includes(q);
        const matchCat = !categoryFilter || i.category === categoryFilter;
        return matchSearch && matchCat;
    });

    const handleAdd = async () => {
        if (!form.item_name.trim()) { alert('Item name required'); return; }
        setSaving(true);
        const r = await add(form);
        if (r.success) { setModalOpen(false); setForm(emptyAutoInventoryForm); }
        else alert('Error: ' + r.error);
        setSaving(false);
    };

    const modalFooter = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : '💾 Add Item'}
            </button>
        </div>
    );

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>📦 Auto Inventory ({items.length})</h1>
                <button onClick={() => setModalOpen(true)} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>➕ Add Item</button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Items', value: items.length, color: '#185FA5' },
                    { label: 'Categories', value: categories.length, color: '#7c3aed' },
                    { label: '⚠️ Low Stock', value: lowStock, color: '#dc2626' },
                    { label: 'Total Value', value: '₹' + totalValue.toLocaleString(), color: '#059669' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search item name, brand, model..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>{filtered.length} / {items.length}</span>
            </div>

            {/* Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                    : filtered.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No items found</p>
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            {['#', 'Item Name', 'Brand', 'Category', 'Model No', 'Stock', 'Unit', 'Purchase ₹', 'Selling ₹', 'GST%'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((item, i) => {
                                            const isLow = (item.stock_qty || 0) <= 2;
                                            return (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: isLow ? '#fff5f5' : 'white' }}>
                                                    <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>{i + 1}</td>
                                                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                                                        {item.item_name}
                                                        {isLow && <span style={{ marginLeft: 6, fontSize: 10, color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: 10 }}>LOW</span>}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{item.brand || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{item.category || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace' }}>{item.model_no || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontWeight: isLow ? 700 : 'normal', color: isLow ? '#dc2626' : 'inherit' }}>{item.stock_qty ?? 0}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{item.unit || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{item.purchase_price ? `₹${item.purchase_price}` : '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#059669' }}>{item.selling_price ? `₹${item.selling_price}` : '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{item.gst_percent ? `${item.gst_percent}%` : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
            </div>

            {/* Add Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="📦 Add Inventory Item" footer={modalFooter}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Item Name *</label><input type="text" value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Brand</label><input type="text" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Category</label>
                            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={fieldStyle}>
                                <option value="">Select Category</option>
                                {AUTO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Model No</label><input type="text" value={form.model_no} onChange={e => setForm(f => ({ ...f, model_no: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Purchase Price ₹</label><input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Selling Price ₹</label><input type="number" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Stock Qty</label><input type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Unit</label><input type="text" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={fieldStyle} placeholder="pcs, mtr, kg..." /></div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>GST %</label><input type="number" value={form.gst_percent} onChange={e => setForm(f => ({ ...f, gst_percent: e.target.value }))} style={fieldStyle} /></div>
                    </div>
                    <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
                </div>
            </Modal>
        </div>
    );
}