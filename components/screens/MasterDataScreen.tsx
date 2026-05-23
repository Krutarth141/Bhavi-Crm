'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface MasterItem {
    type: string;
    name: string;
    code?: string;
    description?: string;
}

export default function MasterDataScreen() {
    const [activeTab, setActiveTab] = useState('brands');
    const [items, setItems] = useState<MasterItem[]>([]);
    const [newItem, setNewItem] = useState({ name: '', code: '', description: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMasterData();
    }, [activeTab]);

    const fetchMasterData = async () => {
        try {
            setLoading(true);
            const tableName = activeTab === 'subcategories' ? 'subcategories' : activeTab;
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setItems(
                (data || []).map((item: any) => ({
                    type: activeTab,
                    name: item.name,
                    code: item.code || '',
                    description: item.description || '',
                }))
            );
        } catch (err) {
            console.error('Failed to fetch master data:', err);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'brands', label: '🏢 Brands' },
        { id: 'categories', label: '📂 Categories' },
        { id: 'subcategories', label: '📋 Sub-Categories' },
        { id: 'models', label: '📱 Models' },
        { id: 'problems', label: '🔧 Problem Types' },
    ];

    const handleAddItem = async () => {
        if (!newItem.name.trim()) {
            alert('Please enter a name');
            return;
        }

        try {
            const tableName = activeTab === 'subcategories' ? 'subcategories' : activeTab;
            const insertData: any = { name: newItem.name };
            if (newItem.code) insertData.code = newItem.code;
            if (newItem.description) insertData.description = newItem.description;

            const { error } = await supabase
                .from(tableName)
                .insert([insertData]);

            if (error) {
                alert('❌ Error: ' + error.message);
                return;
            }

            alert('✅ Added successfully!');
            setNewItem({ name: '', code: '', description: '' });
            await fetchMasterData();
        } catch (err: any) {
            alert('❌ Failed: ' + (err.message || 'Unknown error'));
        }
    };

    const handleDeleteItem = async (index: number) => {
        try {
            const item = items[index];
            const tableName = activeTab === 'subcategories' ? 'subcategories' : activeTab;
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('name', item.name);

            if (error) throw error;
            await fetchMasterData();
        } catch (err) {
            console.error('Failed to delete item:', err);
        }
    };

    return (
        <div className="content-section">
            <h2>🗂️ Master Data Management</h2>

            <div className="tabs" style={{ marginBottom: '18px' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>Add New {activeTab}</h3>
                <div className="master-add-row">
                    <input
                        type="text"
                        placeholder="Name"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    />
                    {activeTab !== 'problems' && (
                        <input
                            type="text"
                            placeholder="Code (optional)"
                            value={newItem.code}
                            onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                        />
                    )}
                    <input
                        type="text"
                        placeholder="Description (optional)"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    />
                    <button className="btn btn-primary" onClick={handleAddItem}>
                        ➕ Add
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginTop: '14px' }}>
                <h3 style={{ marginTop: 0 }}>List of {activeTab}</h3>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Loading...</p>
                ) : items.filter((item) => item.type === activeTab).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                        No items added yet
                    </p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                {activeTab !== 'problems' && <th>Code</th>}
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items
                                .filter((item) => item.type === activeTab)
                                .map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <strong>{item.name}</strong>
                                        </td>
                                        {activeTab !== 'problems' && <td>{item.code || '—'}</td>}
                                        <td>{item.description || '—'}</td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDeleteItem(index)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
