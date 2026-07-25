'use client';

import { useState } from 'react';
import { usePartsCatalog } from '@/hooks/usePartsCatalog';
import { CatalogPart, CatalogStockFilter } from '@/types/partsCatalog';

export default function PartsCatalogScreen() {
    const { parts, loading, error, inStock, outStock } = usePartsCatalog();
    const [search, setSearch] = useState('');
    const [stockFilter, setStockFilter] = useState<CatalogStockFilter>('');

    const filtered: CatalogPart[] = parts.filter(p => {
        const q = search.toLowerCase();
        const matchSearch = !q || [p.code, p.name, p.model].some(v => v.toLowerCase().includes(q));
        const matchStock = !stockFilter
            || (stockFilter === 'in' && p.stock > 0)
            || (stockFilter === 'low' && p.stock > 0 && p.stock <= p.min)
            || (stockFilter === 'out' && p.stock <= 0);
        return matchSearch && matchStock;
    });

    const stockBadge = (p: CatalogPart) => {
        if (p.stock <= 0) return { bg: '#fef2f2', color: '#dc2626', label: 'Out of stock' };
        if (p.stock <= p.min) return { bg: '#fffbeb', color: '#d97706', label: `${p.stock} (low)` };
        return { bg: '#f0fdf4', color: '#059669', label: `${p.stock} in stock` };
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🔩 Parts Catalog ({parts.length})</h1>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Parts', value: parts.length, color: '#1d4ed8' },
                    { label: 'In Stock', value: inStock, color: '#10b981' },
                    { label: 'Out of Stock', value: outStock, color: '#ef4444' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontWeight: 600, textTransform: 'uppercase' as const }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="text" placeholder="🔍 Search part code, name, model..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
                <select value={stockFilter} onChange={e => setStockFilter(e.target.value as CatalogStockFilter)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All Stock</option>
                    <option value="in">In Stock</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Out of Stock</option>
                </select>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{filtered.length} parts</span>
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
                                    {['Part Code', 'Part Name', 'Model No', 'MRP ₹', 'Stock'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((p, i) => {
                                    const badge = stockBadge(p);
                                    return (
                                        <tr key={p.code + i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#1d4ed8', fontWeight: 600 }}>{p.code || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.name}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>{p.model || '—'}</td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{p.price > 0 ? `₹${p.price.toLocaleString('en-IN')}` : '—'}</td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                <span style={{ background: badge.bg, color: badge.color, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{badge.label}</span>
                                            </td>
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