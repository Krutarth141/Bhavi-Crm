'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';

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
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        item_code: '',
        item_name: '',
        category: '',
        qty_in_stock: 0,
        min_stock: 0,
        unit_price: 0,
        brand_id: '',
        description: '',
        part_code: '',
    });

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

    const handleAddItem = () => {
        setFormData({
            item_code: '',
            item_name: '',
            category: '',
            qty_in_stock: 0,
            min_stock: 0,
            unit_price: 0,
            brand_id: '',
            description: '',
            part_code: '',
        });
        setSelectedItem(null);
        setShowAddForm(true);
    };

    const handleViewItem = (item: InventoryItem) => {
        setSelectedItem(item);
        setShowViewModal(true);
    };

    const handleAdjustStock = (item: InventoryItem) => {
        setSelectedItem(item);
        setFormData({
            item_code: item.item_code,
            item_name: item.item_name,
            category: item.category || '',
            qty_in_stock: item.qty_in_stock,
            min_stock: item.min_stock,
            unit_price: item.unit_price,
            brand_id: item.brand_id || '',
            description: item.description || '',
            part_code: item.part_code || '',
        });
        setShowAddForm(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numFields = ['qty_in_stock', 'min_stock', 'unit_price'];

        setFormData((prev) => ({
            ...prev,
            [name]: numFields.includes(name)
                ? (value === '' ? 0 : Number(value) || 0)
                : (value === null ? '' : value),
        }));
    };

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (!formData.item_code || !formData.item_name) {
                alert('Item Code and Item Name are required');
                setSubmitting(false);
                return;
            }

            const dataToSubmit = {
                ...formData,
                brand_id: null,
                updated_at: new Date().toISOString(),
            };

            if (selectedItem?.id) {
                const { error } = await supabase
                    .from('inventory')
                    .update(dataToSubmit)
                    .eq('id', selectedItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('inventory')
                    .insert([dataToSubmit]);
                if (error) throw error;
            }

            alert('✅ Item saved successfully!');
            setShowAddForm(false);
            fetchInventory();
        } catch (err: any) {
            alert('❌ Error: ' + (err.message || 'Failed to save item'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const { error } = await supabase
                .from('inventory')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('✅ Item deleted successfully!');
            fetchInventory();
        } catch (err: any) {
            alert('❌ Error: ' + (err.message || 'Failed to delete item'));
        }
    };

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
                <button className="btn btn-primary" onClick={handleAddItem}>
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
                                        <td style={{ whiteSpace: 'nowrap', gap: '4px', display: 'flex' }}>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => handleAdjustStock(item)}
                                            >
                                                ⚙️ Adjust
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDeleteItem(item.id)}
                                                style={{ background: '#f05252' }}
                                            >
                                                🗑 Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Inventory Modal */}
            <Modal
                isOpen={showAddForm}
                title={selectedItem ? 'Adjust Stock' : 'Add New Part'}
                onClose={() => setShowAddForm(false)}
                footer={
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" onClick={() => setShowAddForm(false)}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmitForm}
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : '💾 Save Item'}
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleSubmitForm} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div className="form-group">
                        <label>Item Code *</label>
                        <input type="text" name="item_code" value={formData.item_code || ''} onChange={handleFormChange} placeholder="IC-001" required />
                    </div>
                    <div className="form-group">
                        <label>Item Name *</label>
                        <input type="text" name="item_name" value={formData.item_name || ''} onChange={handleFormChange} placeholder="Item name" required />
                    </div>
                    <div className="form-group">
                        <label>Category</label>
                        <input type="text" name="category" value={formData.category || ''} onChange={handleFormChange} placeholder="Electronics, Spare Parts, etc." />
                    </div>
                    <div className="form-group">
                        <label>Part Code</label>
                        <input type="text" name="part_code" value={formData.part_code || ''} onChange={handleFormChange} placeholder="OEM part code" />
                    </div>
                    <div className="form-group">
                        <label>Qty in Stock</label>
                        <input type="number" name="qty_in_stock" value={formData.qty_in_stock || 0} onChange={handleFormChange} min="0" step="1" />
                    </div>
                    <div className="form-group">
                        <label>Min Stock Level</label>
                        <input type="number" name="min_stock" value={formData.min_stock || 0} onChange={handleFormChange} min="0" step="1" />
                    </div>
                    <div className="form-group">
                        <label>Unit Price ₹</label>
                        <input type="number" name="unit_price" value={formData.unit_price || 0} onChange={handleFormChange} min="0" step="0.01" />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                        <label>Description</label>
                        <textarea name="description" value={formData.description || ''} onChange={handleFormChange} placeholder="Item description" rows={2} />
                    </div>
                </form>
            </Modal>

            {/* View Item Modal */}
            <Modal
                isOpen={showViewModal}
                title="Item Details"
                onClose={() => setShowViewModal(false)}
                footer={
                    <button className="btn btn-outline" onClick={() => setShowViewModal(false)}>
                        Close
                    </button>
                }
            >
                {selectedItem && (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><strong>Item Code:</strong> {selectedItem.item_code}</div>
                            <div><strong>Part Code:</strong> {selectedItem.part_code || '—'}</div>
                            <div><strong>Item Name:</strong> {selectedItem.item_name}</div>
                            <div><strong>Category:</strong> {selectedItem.category || '—'}</div>
                            <div><strong>Stock Qty:</strong> {selectedItem.qty_in_stock}</div>
                            <div><strong>Min Stock:</strong> {selectedItem.min_stock}</div>
                            <div><strong>Unit Price:</strong> ₹{(selectedItem.unit_price || 0).toLocaleString()}</div>
                            <div><strong>Brand:</strong> {selectedItem.brand_id || '—'}</div>
                        </div>
                        <div><strong>Description:</strong> {selectedItem.description || '—'}</div>
                        <div><strong>Updated:</strong> {new Date(selectedItem.updated_at).toLocaleString()}</div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
