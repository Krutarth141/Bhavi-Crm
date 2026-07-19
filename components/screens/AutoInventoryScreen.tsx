'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAutoInventory } from '@/hooks/useAutoInventory';
import { AutoInventoryItem } from '@/types/autoInventory';
import AutoInventoryFormModal from '@/components/screens/auto-inventory/AutoInventoryFormModal';
import StockModal from '@/components/screens/auto-inventory/StockModal';
import InventoryHistoryModal from '@/components/screens/auto-inventory/InventoryHistoryModal';

export default function AutoInventoryScreen() {
    const { data: session } = useSession();
    const userName = (session?.user as any)?.name || '';

    const { items, loading, error, brands, lowStock, totalValue, add, update, remove, stockTxn } = useAutoInventory();

    const [search, setSearch] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editItem, setEditItem] = useState<AutoInventoryItem | null>(null);
    const [stockItem, setStockItem] = useState<AutoInventoryItem | null>(null);
    const [historyItem, setHistoryItem] = useState<AutoInventoryItem | null>(null);

    const filtered = items.filter(i => {
        const q = search.toLowerCase();
        const matchSearch = !search.trim() || i.item_name?.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q) || i.model_no?.toLowerCase().includes(q);
        const matchBrand = !brandFilter || i.brand === brandFilter;
        return matchSearch && matchBrand;
    });

    const handleDelete = async (item: AutoInventoryItem) => {
        if (!confirm(`Delete "${item.item_name}"? This cannot be undone.`)) return;
        const r = await remove(item.id);
        if (!r.success) alert('Delete error: ' + r.error);
    };

    const btnIcon = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 5px' } as const;

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>📦 Auto Inventory ({items.length})</h1>
                <button onClick={() => { setEditItem(null); setFormOpen(true); }} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>➕ Add Item</button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Items', value: items.length, color: '#185FA5' },
                    { label: 'Brands', value: brands.length, color: '#7c3aed' },
                    { label: '⚠️ Low Stock', value: lowStock, color: '#dc2626' },
                    { label: 'Stock Value', value: '₹' + totalValue.toLocaleString('en-IN'), color: '#059669' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search item / brand / model..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
                <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All Brands</option>
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>{filtered.length} / {items.length}</span>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                    : filtered.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No items yet. Click &quot;Add Item&quot; to get started!</p>
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1000 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            {['Brand / Made In', 'Model No', 'Item Name', 'Category', 'Unit', 'Purchase ₹', 'Sell ₹', 'GST', 'Stock', 'Stock Value', 'Action'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(it => {
                                            const stockValue = (it.purchase_price || 0) * (it.stock_qty || 0);
                                            return (
                                                <tr key={it.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{it.brand || '—'}</span>
                                                        {it.made_in && <><br /><span style={{ fontSize: 10, color: '#6b7280' }}>🌐 {it.made_in}</span></>}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600 }}>{it.model_no || '—'}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <span onClick={() => setHistoryItem(it)} style={{ cursor: 'pointer', color: '#185FA5', fontWeight: 600 }} title="View history">{it.item_name}</span>
                                                        {it.description && <><br /><span style={{ fontSize: 11, color: '#6b7280' }}>{it.description}</span></>}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{it.category || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{it.unit || 'pcs'}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>₹{Number(it.purchase_price || 0).toLocaleString('en-IN')}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#065f46' }}>{it.selling_price ? `₹${Number(it.selling_price).toLocaleString('en-IN')}` : '—'}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#6b7280' }}>{it.gst_percent ? `${it.gst_percent}%` : '—'}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: (it.stock_qty || 0) > 0 ? '#065f46' : '#dc2626' }}>{it.stock_qty || 0}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#065f46', fontWeight: 600 }}>₹{Number(stockValue).toLocaleString('en-IN')}</td>
                                                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                                        <button onClick={() => setStockItem(it)} title="Stock IN/OUT/Sell" style={btnIcon}>📦</button>
                                                        <button onClick={() => setHistoryItem(it)} title="IN/OUT History" style={btnIcon}>📋</button>
                                                        <button onClick={() => { setEditItem(it); setFormOpen(true); }} title="Edit" style={btnIcon}>✏️</button>
                                                        <button onClick={() => handleDelete(it)} title="Delete" style={{ ...btnIcon, color: '#dc2626' }}>🗑️</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
            </div>

            {formOpen && (
                <AutoInventoryFormModal
                    editItem={editItem}
                    allItems={items}
                    onClose={() => { setFormOpen(false); setEditItem(null); }}
                    onSave={async (form) => editItem ? update(editItem.id, form) : add(form, userName)}
                />
            )}
            {stockItem && (
                <StockModal
                    item={stockItem}
                    onClose={() => setStockItem(null)}
                    onSave={async (params) => stockTxn({ item: stockItem, doneBy: userName, ...params })}
                />
            )}
            {historyItem && <InventoryHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}
        </div>
    );
}