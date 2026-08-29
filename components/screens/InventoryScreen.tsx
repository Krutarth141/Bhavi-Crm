'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useInventory } from '@/hooks/useInventory';
import { InventoryItem, TransactionData } from '@/types/inventory';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { InventoryStats } from '@/components/inventory/InventoryStats';
import { InventoryModals } from '@/components/inventory/InventoryModals';
import PurchaseHistoryTab from '@/components/screens/inventory/PurchaseHistoryTab';
import SalesHistoryTab from '@/components/screens/inventory/SalesHistoryTab';
import PartHistoryModal from '@/components/screens/inventory/PartHistoryModal';
import BulkActionsBar from '@/components/screens/inventory/BulkActionsBar';
import { useMasters } from '@/hooks/useMasters';
import { isAccountant } from '@/lib/permissions';

type ModalMode = 'add' | 'edit' | 'view' | null;
type InvTab = 'stock' | 'purchase' | 'sales' | 'tally';

export default function InventoryScreen() {
    const { data: session } = useSession();
    const userName = (session?.user as any)?.name ?? 'Admin';
    const canTally = (session?.user as any)?.role === 'admin' || isAccountant(session);
    const [activeTab, setActiveTab] = useState<InvTab>('stock');

    // Data fetching
    const { inventory, loading, categories, saveInventoryItem, saveStockTransaction, deleteInventoryItem, fetchInventory } = useInventory();
    const { brands } = useMasters();

    // Stock Tally — physical stock-count reconciliation
    const [tallyConsumablesOnly, setTallyConsumablesOnly] = useState(false);
    const [tallyCounts, setTallyCounts] = useState<Record<string, string>>({});
    const [tallySaving, setTallySaving] = useState(false);

    // UI State
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [showStockTransactionModal, setShowStockTransactionModal] = useState(false);
    const [transactionType, setTransactionType] = useState<'in' | 'out' | 'sell'>('in');
    const [submitting, setSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    const [stockFilter, setStockFilter] = useState<'' | 'low' | 'out'>('');

    // Filtered Data
    const filteredInventory = useMemo(() => {
        return inventory.filter((item) => {
            const matchesSearch =
                !searchTerm ||
                item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.part_code?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = !selectedCategory || item.category === selectedCategory;

            const matchesStock =
                !stockFilter ||
                (stockFilter === 'low' && item.qty_in_stock > 0 && item.qty_in_stock <= item.min_stock) ||
                (stockFilter === 'out' && item.qty_in_stock <= 0);

            return matchesSearch && matchesCategory && matchesStock;
        });
    }, [inventory, searchTerm, selectedCategory, stockFilter]);

    const tallyItems = useMemo(() => {
        return inventory.filter((item) => !tallyConsumablesOnly || item.is_consumable);
    }, [inventory, tallyConsumablesOnly]);

    const handleSaveTally = async () => {
        const mismatches = tallyItems
            .map((item) => ({ item, counted: tallyCounts[item.id] !== undefined ? parseFloat(tallyCounts[item.id]) : item.qty_in_stock }))
            .filter(({ item, counted }) => !isNaN(counted) && counted !== item.qty_in_stock);

        if (!mismatches.length) { alert('No mismatches — nothing to save.'); return; }
        if (!confirm(`${mismatches.length} item(s) have a count mismatch. Save tally and correct stock levels?`)) return;

        setTallySaving(true);
        let done = 0;
        for (const { item, counted } of mismatches) {
            const delta = counted - item.qty_in_stock;
            const r = await saveStockTransaction(
                item,
                { quantity: Math.abs(delta), date: new Date().toISOString().split('T')[0], note: `Stock Tally: system ${item.qty_in_stock} → counted ${counted}`, supplier: '', invoice: '', customer: '', sell_price: 0 },
                delta > 0 ? 'in' : 'out',
                userName,
            );
            if (r.success) done++;
        }
        setTallySaving(false);
        setTallyCounts({});
        alert(`✅ Tally saved — ${done}/${mismatches.length} item(s) corrected.`);
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? filteredInventory.map(i => i.id) : []);
    };

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
                brand_id: null,
                category: '',
                qty_in_stock: 0,
                min_stock: 0,
                purchase_price: 0,
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
            const result = await saveStockTransaction(selectedItem, transactionData, transactionType, userName);
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

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
                    {([{ id: 'stock', label: '📦 Stock' }, { id: 'purchase', label: '🛒 Purchase' }, { id: 'sales', label: '💰 Sales' }, ...(canTally ? [{ id: 'tally', label: '🧮 Stock Tally' }] : [])] as { id: InvTab; label: string }[]).map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400, color: activeTab === tab.id ? '#185FA5' : '#6b7280', borderBottom: activeTab === tab.id ? '2px solid #185FA5' : '2px solid transparent', marginBottom: -1 }}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'purchase' && <PurchaseHistoryTab inventory={inventory} addedBy={userName} />}
                {activeTab === 'sales' && <SalesHistoryTab inventory={inventory} addedBy={userName} />}

                {activeTab === 'tally' && canTally && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                                <input type="checkbox" checked={tallyConsumablesOnly} onChange={(e) => setTallyConsumablesOnly(e.target.checked)} />
                                Consumables only
                            </label>
                            <button
                                onClick={handleSaveTally}
                                disabled={tallySaving}
                                style={{ padding: '10px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', opacity: tallySaving ? 0.6 : 1 }}
                            >
                                {tallySaving ? 'Saving...' : '💾 Save Tally & Generate Report'}
                            </button>
                        </div>
                        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Item', 'Part Code', 'System Qty', 'Counted Qty', 'Mismatch'].map((h) => (
                                            <th key={h} style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tallyItems.map((item) => {
                                        const countedStr = tallyCounts[item.id] ?? String(item.qty_in_stock);
                                        const counted = parseFloat(countedStr);
                                        const mismatch = !isNaN(counted) && counted !== item.qty_in_stock;
                                        return (
                                            <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9', background: mismatch ? '#fffbeb' : undefined }}>
                                                <td style={{ padding: 8, fontWeight: 600 }}>{item.item_name}</td>
                                                <td style={{ padding: 8, color: '#64748b' }}>{item.part_code || '—'}</td>
                                                <td style={{ padding: 8 }}>{item.qty_in_stock}</td>
                                                <td style={{ padding: 8 }}>
                                                    <input
                                                        type="number"
                                                        value={countedStr}
                                                        onChange={(e) => setTallyCounts((c) => ({ ...c, [item.id]: e.target.value }))}
                                                        style={{ width: 90, padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
                                                    />
                                                </td>
                                                <td style={{ padding: 8 }}>
                                                    {mismatch && (
                                                        <span style={{ color: counted > item.qty_in_stock ? '#059669' : '#dc2626', fontWeight: 700 }}>
                                                            {counted > item.qty_in_stock ? '+' : ''}{counted - item.qty_in_stock}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'stock' && (
                    <>
                        <BulkActionsBar
                            inventory={inventory}
                            brands={brands}
                            selectedIds={selectedIds}
                            addedBy={userName}
                            onClearSelection={() => setSelectedIds([])}
                            onRefresh={fetchInventory}
                        />
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
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value as '' | 'low' | 'out')}
                                style={{
                                    padding: '10px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                }}
                            >
                                <option value="">All Stock</option>
                                <option value="low">Low Stock</option>
                                <option value="out">Out of Stock</option>
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
                    </>
                )}
            </div>

            {/* Inventory Table */}
            {activeTab === 'stock' && (
                <InventoryTable
                    filteredInventory={filteredInventory}
                    brands={brands}
                    selectedIds={selectedIds}
                    onToggleOne={toggleSelectOne}
                    onToggleAll={toggleSelectAll}
                    onViewItem={openViewModal}
                    onAdjustStock={openStockModal}
                    onEditItem={(item) => openAddForm(item)}
                    onDeleteItem={handleDeleteItem}
                    onOpenHistory={setHistoryItem}
                />
            )}

            {/* Modals */}
            <InventoryModals
                showAddForm={modalMode === 'add' || modalMode === 'edit'}
                showViewModal={modalMode === 'view'}
                showStockTransactionModal={showStockTransactionModal}
                selectedItem={selectedItem}
                brands={brands}
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
            {historyItem && <PartHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}
        </div>
    );
}