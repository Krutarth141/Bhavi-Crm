// components/screens/InventoryScreen.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import { useInventory, TallyReportRow } from '@/hooks/useInventory';
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
    const {
        inventory, loading, saveInventoryItem, saveStockTransaction, deleteInventoryItem, fetchInventory,
        engStockByPart, tallyDraft, tallyLoading, loadTallyData, setTallyPhysical, clearTallyDraft, saveStockTally,
    } = useInventory();
    const { brands } = useMasters();

    // Stock Tally — physical stock-count reconciliation (index.html:8406-8587)
    const [tallyConsumablesOnly, setTallyConsumablesOnly] = useState(false);
    const [tallySearch, setTallySearch] = useState('');
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
    const [stockFilter, setStockFilter] = useState<'' | 'low' | 'out'>('');

    // Filtered Data
    const filteredInventory = useMemo(() => {
        return inventory.filter((item) => {
            const matchesSearch =
                !searchTerm ||
                item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.part_code?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStock =
                !stockFilter ||
                (stockFilter === 'low' && item.qty_in_stock > 0 && item.qty_in_stock <= item.min_stock) ||
                (stockFilter === 'out' && item.qty_in_stock <= 0);

            return matchesSearch && matchesStock;
        });
    }, [inventory, searchTerm, stockFilter]);

    // Rows sorted by part code, filtered by search + consumables-only
    // (index.html:8460-8464).
    const tallyItems = useMemo(() => {
        const q = tallySearch.toLowerCase();
        return inventory
            .filter((item) => (!tallyConsumablesOnly || item.is_consumable) && (!q || (item.part_code || '').toLowerCase().includes(q) || (item.item_name || '').toLowerCase().includes(q)))
            .sort((a, b) => (a.part_code || '').localeCompare(b.part_code || ''));
    }, [inventory, tallyConsumablesOnly, tallySearch]);

    const tallyCountedCount = useMemo(
        () => Object.keys(tallyDraft).filter((k) => tallyDraft[k] !== '' && tallyDraft[k] !== undefined).length,
        [tallyDraft]
    );

    // "Save Tally & Generate Report" always proceeds once ≥1 count is
    // entered — even with zero mismatches — matching HTML's saveStockTally()
    // (index.html:8539-8580), which never gates on mismatches existing.
    const handleSaveTally = async () => {
        setTallySaving(true);
        const r = await saveStockTally(inventory, userName);
        setTallySaving(false);
        if (!r.success) { alert(r.error === 'Enter at least one physical count before saving.' ? `⚠️ ${r.error}` : `Error saving tally: ${r.error}`); return; }
        alert(`✅ Tally saved! ${r.countedCount} part(s) counted, ${r.mismatches} corrected. Report downloading...`);
        downloadTallyReportExcel(r.reportRows || [], new Date().toLocaleDateString('en-CA'));
    };

    const downloadTallyReportExcel = (rows: TallyReportRow[], date: string) => {
        if (!rows.length) return;
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stock Tally');
        XLSX.writeFile(wb, `Stock_Tally_${date}.xlsx`);
    };

    const handleClearTallyCounts = async () => {
        if (!confirm('Clear ALL entered counts (including saved progress)? This cannot be undone.')) return;
        await clearTallyDraft();
    };

    // Loads "With Engineers" totals + restores any saved draft counts when the
    // Stock Tally tab is opened — mirrors HTML's renderInvTallyTab() being
    // invoked on tab switch (index.html:8414), not on every screen mount.
    useEffect(() => {
        if (activeTab === 'tally' && canTally) loadTallyData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, canTally]);

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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                            <h3 style={{ margin: 0, fontSize: 15 }}>🧮 Stock Tally</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={handleClearTallyCounts} style={{ padding: '8px 14px', border: '1px solid #e2e8f0', background: '#fff', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>↺ Clear Counts</button>
                                <button
                                    onClick={handleSaveTally}
                                    disabled={tallySaving}
                                    style={{ padding: '10px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', opacity: tallySaving ? 0.6 : 1 }}
                                >
                                    {tallySaving ? 'Saving...' : '💾 Save Tally & Generate Report'}
                                </button>
                            </div>
                        </div>
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12.5, color: '#1e40af' }}>
                            📋 <b>How to use:</b> Physically count each part in the office and type the counted qty in the &quot;Physical Count&quot; column. Your counts auto-save as you type — close this and come back anytime (even a different device) and they&apos;ll still be here. &quot;With Engineers&quot; is shown for reference only (that stock is out with engineers, not counted here). When fully done, click <b>Save Tally &amp; Generate Report</b> — any part where Physical ≠ System gets corrected (logged in Movement Log) and a report downloads.
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                            <input
                                type="text"
                                placeholder="🔍 Search part code or name..."
                                value={tallySearch}
                                onChange={(e) => setTallySearch(e.target.value)}
                                style={{ flex: 1, minWidth: 220, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#92400e', background: '#fef3c7', padding: '7px 12px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                <input type="checkbox" checked={tallyConsumablesOnly} onChange={(e) => setTallyConsumablesOnly(e.target.checked)} /> 🧴 Consumables only (for weekly tally)
                            </label>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>
                            {tallyLoading ? 'Loading tally data…' : `${tallyCountedCount} of ${inventory.length} parts counted so far${tallyConsumablesOnly ? ` (showing Consumables only — ${tallyItems.length} items)` : ''}`}
                        </div>
                        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>Part Code</th>
                                        <th style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>Item Name</th>
                                        <th style={{ padding: 8, fontWeight: 600 }}>🏢 System (Office)</th>
                                        <th style={{ padding: 8, fontWeight: 600 }}>👷 With Engineers</th>
                                        <th style={{ padding: 8, fontWeight: 600 }}>✏️ Physical Count</th>
                                        <th style={{ padding: 8, fontWeight: 600 }}>Variance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tallyItems.length === 0 ? (
                                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>No items found</td></tr>
                                    ) : tallyItems.map((item) => {
                                        const officeQty = item.qty_in_stock || 0;
                                        const withEng = engStockByPart[item.id] || 0;
                                        const phys = tallyDraft[item.id];
                                        const hasPhys = phys !== undefined && phys !== '';
                                        const variance = hasPhys ? (parseInt(phys) || 0) - officeQty : null;
                                        return (
                                            <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: 8, fontWeight: 700, color: '#185FA5' }}>
                                                    {item.part_code || '—'}
                                                    {item.is_consumable && <span style={{ fontSize: 9, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 4, marginLeft: 4 }}>CONS</span>}
                                                </td>
                                                <td style={{ padding: 8 }}>{item.item_name}</td>
                                                <td style={{ padding: 8, textAlign: 'center' }}>{officeQty}</td>
                                                <td style={{ padding: 8, textAlign: 'center', color: '#0891b2', fontWeight: 600 }}>{withEng}</td>
                                                <td style={{ padding: 8, textAlign: 'center' }}>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        placeholder="Count"
                                                        value={phys ?? ''}
                                                        onChange={(e) => setTallyPhysical(item.id, e.target.value, userName)}
                                                        style={{ width: 90, textAlign: 'center', padding: '5px 8px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
                                                    />
                                                </td>
                                                <td style={{ padding: 8, textAlign: 'center' }}>
                                                    {variance === null
                                                        ? <span style={{ color: '#94a3b8' }}>—</span>
                                                        : variance === 0
                                                            ? <span style={{ color: '#059669', fontWeight: 700 }}>0 ✓</span>
                                                            : <span style={{ color: variance > 0 ? '#0891b2' : '#dc2626', fontWeight: 700 }}>{variance > 0 ? '+' : ''}{variance}</span>}
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
                                gridTemplateColumns: '1fr 200px auto',
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