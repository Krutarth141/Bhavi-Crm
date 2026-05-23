'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface InventoryItem {
    id: string;
    item_code: string;
    item_name: string;
    category: string | null;
    qty_in_stock: number;
    min_stock: number;
    unit_price: number;
    brand_id: string | null;
    description: string | null;
    part_code: string | null;
    created_at: string;
    updated_at: string;
}

export default function InventoryScreen() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showLowStock, setShowLowStock] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('item_name', { ascending: true });

            if (error) throw error;
            setInventory(data || []);
        } catch (err) {
            console.error('Failed to fetch inventory:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredInventory = inventory.filter((item) => {
        const matchesSearch =
            item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
            (item.category?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
        const matchesStockFilter = showLowStock ? item.qty_in_stock <= item.min_stock : true;
        return matchesSearch && matchesStockFilter;
    });

    const lowStockItems = inventory.filter((item) => item.qty_in_stock <= item.min_stock);

    return (
        <div className="content-section">
            <div className="section-header">
                <div>
                    <h2>📦 Inventory Management</h2>
                    {lowStockItems.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#f05252', marginTop: '4px' }}>
                            ⚠️ {lowStockItems.length} items low in stock
                        </div>
                    )}
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                    ➕ Add Part
                </button>
            </div>

            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="Search parts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1 }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                        type="checkbox"
                        checked={showLowStock}
                        onChange={(e) => setShowLowStock(e.target.checked)}
                    />
                    Low Stock Only
                </label>
            </div>

            {loading ? (
                <p className="loading">Loading inventory...</p>
            ) : filteredInventory.length === 0 ? (
                <p className="empty-message">No items found</p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th>Stock</th>
                                <th>Min Stock</th>
                                <th>Price ₹</th>
                                <th>Status</th>
                                <th>Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.map((item) => {
                                const isLow = item.qty_in_stock <= item.min_stock;
                                return (
                                    <tr key={item.id}>
                                        <td>
                                            <strong>{item.item_code || item.part_code || '—'}</strong>
                                        </td>
                                        <td>{item.item_name}</td>
                                        <td>{item.category || '—'}</td>
                                        <td>
                                            <strong style={{ color: isLow ? '#f05252' : '#065f46' }}>
                                                {item.qty_in_stock}
                                            </strong>
                                        </td>
                                        <td>{item.min_stock}</td>
                                        <td>₹{(item.unit_price || 0).toLocaleString()}</td>
                                        <td>
                                            <span
                                                className={`badge ${isLow ? 'badge-pending' : 'badge-approve'}`}
                                            >
                                                {isLow ? '⚠️ Low' : '✓ OK'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '12px' }}>
                                            {new Date(item.updated_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-primary">Adjust</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
