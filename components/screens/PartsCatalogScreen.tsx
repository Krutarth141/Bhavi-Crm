'use client';

import { useState } from 'react';
import { usePartsCatalog } from '@/hooks/usePartsCatalog';
import { CatalogPart } from '@/types/partsCatalog';

export default function PartsCatalogScreen() {
    const { parts, loading, error, categories, lowStock } = usePartsCatalog();
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const filtered: CatalogPart[] = parts.filter(p => {
        const q = search.toLowerCase();
        const matchSearch = !search.trim() ||
            p.part_name?.toLowerCase().includes(q) ||
            p.item_code?.toLowerCase().includes(q) ||
            p.compatible_models?.toLowerCase().includes(q);
        const matchCat = !categoryFilter || p.category === categoryFilter;
        return matchSearch && matchCat;
    });

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🔩 Parts Catalog ({parts.length})</h1>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Parts', value: parts.length, color: '#185FA5' },
                    { label: 'Categories', value: categories.length, color: '#7c3aed' },
                    { label: '⚠️ Low Stock', value: lowStock, color: '#dc2626' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search part name, code, compatible models..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>{filtered.length} / {parts.length}</span>
            </div>

            {/* Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>Loading...</p>
                ) : filtered.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>No parts found</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    {['#', 'Part Name', 'Item Code', 'Category', 'Stock', 'Selling Price', 'Compatible Models', 'Notes'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((p, i) => {
                                    const isLow = p.stock_qty !== undefined && p.stock_qty !== null && p.stock_qty <= 2;
                                    return (
                                        <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', background: isLow ? '#fff5f5' : 'white' }}>
                                            <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>{i + 1}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                                                {p.part_name}
                                                {isLow && <span style={{ marginLeft: 6, fontSize: 10, color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: 10 }}>LOW</span>}
                                            </td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace' }}>{p.item_code || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{p.category || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: isLow ? 700 : 'normal', color: isLow ? '#dc2626' : 'inherit' }}>{p.stock_qty ?? '—'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{p.selling_price ? `₹${p.selling_price.toLocaleString()}` : '—'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', maxWidth: 200 }}>{p.compatible_models || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{p.notes || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}