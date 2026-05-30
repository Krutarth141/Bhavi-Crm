'use client';

import { useState, useMemo } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { InventoryItem, TransactionData } from '@/types/inventory';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { InventoryStats } from '@/components/inventory/InventoryStats';
import { InventoryModals } from '@/components/inventory/InventoryModals';

type ModalMode = 'add' | 'edit' | 'view' | null;

export default function InventoryScreen() {
    // Data fetching
    const { inventory, loading, categories, saveInventoryItem, saveStockTransaction, deleteInventoryItem } = useInventory();

    // UI State
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [showStockTransactionModal, setShowStockTransactionModal] = useState(false);
    const [transactionType, setTransactionType] = useState<'in' | 'out' | 'sell'>('in');
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<InventoryItem>>({});
    const [transactionData, setTransactionData] = useState<TransactionData>({
        quantity: 0,
        date: new Date().toISOString().split('T')[0],
        note: '',
        supplier: '',
        invoice: '',
        customer: '',
        sell_price: 0,
    });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // Filtered Data
    const filteredInventory = useMemo(() => {
        return inventory.filter((item) => {
            const matchesSearch =
                !searchTerm ||
                item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.part_code?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = !selectedCategory || item.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [inventory, searchTerm, selectedCategory]);

    // Modal Handlers
    const openAddForm = (item?: InventoryItem) => {
        if (item) {
            setFormData(item);
            setModalMode('edit');
            setSelectedItem(item);
        } else {
            setFormData({
                item_name: '',
                item_code: '',
                part_code: '',
                category: '',
                qty_in_stock: 0,
                min_stock: 0,
                unit_price: 0,
                gst_pct: 18,
                description: '',
            });
            setModalMode('add');
            setSelectedItem(null);
        }
    };

    const closeAddForm = () => {
        setModalMode(null);
        setFormData({});
    };

    const openViewModal = (item: InventoryItem) => {
        setSelectedItem(item);
        setModalMode('view');
    };

    const closeViewModal = () => {
        setModalMode(null);
        setSelectedItem(null);
    };

    const openStockModal = (item: InventoryItem) => {
        setSelectedItem(item);
        setShowStockTransactionModal(true);
        setTransactionData({
            quantity: 0,
            date: new Date().toISOString().split('T')[0],
            note: '',
            supplier: '',
            invoice: '',
            customer: '',
            sell_price: 0,
        });
        setTransactionType('in');
    };

    const closeStockModal = () => {
        setShowStockTransactionModal(false);
        setSelectedItem(null);
    };

    // Form Handlers
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const parsedValue = type === 'number' ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: parsedValue }));
    };

    const handleTransactionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const parsedValue = type === 'number' ? parseFloat(value) || 0 : value;
        setTransactionData(prev => ({ ...prev, [name]: parsedValue }));
    };

    // Save Handlers
    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.item_name) {
            alert('Item name is required');
            return;
        }

        setSubmitting(true);
        try {
            const result = await saveInventoryItem(formData, modalMode === 'edit' ? selectedItem?.id : undefined);
            if (result.success) {
                alert(modalMode === 'edit' ? '✅ Item updated successfully' : '✅ Item added successfully');
                closeAddForm();
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (err: any) {
            alert(`❌ Error: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveTransaction = async () => {
        if (!selectedItem) return;
        if (transactionData.quantity <= 0) {
            alert('Quantity must be greater than 0');
            return;
        }

        setSubmitting(true);
        try {
            const result = await saveStockTransaction(selectedItem, transactionData, transactionType);
            if (result.success) {
                alert('✅ Stock updated successfully');
                closeStockModal();
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (err: any) {
            alert(`❌ Error: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteItem = async (item: InventoryItem) => {
        if (!confirm(`Delete "${item.item_name}"? This cannot be undone.`)) return;

        try {
            const result = await deleteInventoryItem(item.id);
            if (result.success) {
                alert('✅ Item deleted successfully');
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (err: any) {
            alert(`❌ Error: ${err.message}`);
        }
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading inventory...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>📦 Inventory Management</h2>

                {/* KPI Cards */}
                <InventoryStats inventory={inventory} />

                {/* Search & Filters */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 200px 200px auto',
                        gap: '12px',
                        marginBottom: '16px',
                    }}
                >
                    <input
                        type="text"
                        placeholder="🔍 Search items by name, code, or part..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            padding: '10px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                        }}
                    />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{
                            padding: '10px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                        }}
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select
                        style={{
                            padding: '10px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                        }}
                    >
                        <option>Sort: A-Z</option>
                        <option>Sort: Low Stock</option>
                        <option>Sort: Price High</option>
                    </select>
                    <button
                        onClick={() => openAddForm()}
                        style={{
                            padding: '10px 16px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                    >
                        ➕ Add New
                    </button>
                </div>

                {/* Results */}
                <div style={{ marginBottom: '8px', fontSize: '13px', color: '#64748b' }}>
                    Showing {filteredInventory.length} of {inventory.length} items
                </div>
            </div>

            {/* Inventory Table */}
            <InventoryTable
                filteredInventory={filteredInventory}
                onViewItem={openViewModal}
                onAdjustStock={openStockModal}
                onEditItem={(item) => openAddForm(item)}
                onDeleteItem={handleDeleteItem}
            />

            {/* Modals */}
            <InventoryModals
                showAddForm={modalMode === 'add' || modalMode === 'edit'}
                showViewModal={modalMode === 'view'}
                showStockTransactionModal={showStockTransactionModal}
                selectedItem={selectedItem}
                formData={formData}
                transactionData={transactionData}
                transactionType={transactionType}
                submitting={submitting}
                onCloseAddForm={closeAddForm}
                onCloseViewModal={closeViewModal}
                onCloseStockModal={closeStockModal}
                onFormChange={handleFormChange}
                onTransactionChange={handleTransactionChange}
                onTransactionTypeChange={setTransactionType}
                onSaveForm={handleSaveForm}
                onSaveTransaction={handleSaveTransaction}
            />
        </div>
    );
}
