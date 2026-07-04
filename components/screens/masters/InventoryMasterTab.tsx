'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface InventoryItem {
    id: string;
    item_name: string;
    item_code?: string;
    category?: string;
    unit?: string;
    min_stock?: number;
    current_stock?: number;
    selling_price?: number;
    is_active?: boolean;
}

export default function InventoryMasterTab() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('item_name');
            if (error) throw error;
            setItems(data || []);
        } catch (e: any) {
            console.error('Inventory fetch error:', e.message);
        } finally {
            setLoading(false);
        }
    };

    const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();

    const filtered = items.filter(item => {
        const matchSearch = !search.trim() ||
            item.item_name?.toLowerCase().includes(search.toLowerCase()) ||
            item.item_code?.toLowerCase().includes(search.toLowerCase());
        const matchCat = !categoryFilter || item.category === categoryFilter;
        return matchSearch && matchCat;
    });

    const lowStock = items.filter(i => i.min_stock && (i.current_stock || 0) <= i.min_stock);

    return (
        <div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                {[
                    { label: 'Total Items', value: items.length, color: '#185FA5' },
                    { label: 'Categories', value: categories.length, color: '#6d28d9' },
                    { label: 'Low Stock', value: lowStock.length, color: lowStock.length > 0 ? '#991b1b' : '#065f46' },
                ].map(stat => (
                    <div key={stat.label} className="card" style={{ flex: 1, padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="card">
                {/* Filters */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input
                        type="text"
                        placeholder="Search item..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ maxWidth: 160 }}>
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                        {filtered.length}/{items.length}
                    </span>
                </div>

                {loading ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading...</p>
                ) : !filtered.length ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No items found</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr><th>#</th><th>Item Name</th><th>Code</th><th>Category</th><th>Stock</th><th>Min Stock</th><th>Price</th></tr>
                            </thead>
                            <tbody>
                                {filtered.map((item, i) => {
                                    const isLow = item.min_stock && (item.current_stock || 0) <= item.min_stock;
                                    return (
                                        <tr key={item.id} style={isLow ? { background: '#fff5f5' } : {}}>
                                            <td>{i + 1}</td>
                                            <td>
                                                <strong>{item.item_name}</strong>
                                                {isLow && <span style={{ marginLeft: 6, fontSize: 11, color: '#991b1b' }}>⚠️ Low</span>}
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.item_code || '—'}</td>
                                            <td>{item.category || '—'}</td>
                                            <td style={{ color: isLow ? '#991b1b' : 'inherit', fontWeight: isLow ? 700 : 'normal' }}>
                                                {item.current_stock ?? '—'}
                                            </td>
                                            <td>{item.min_stock ?? '—'}</td>
                                            <td>{item.selling_price ? `₹${item.selling_price.toLocaleString()}` : '—'}</td>
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