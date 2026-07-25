'use client';

import { useEffect, useMemo, useState } from 'react';
import { InventoryItem, InventoryPurchase } from '@/types/inventory';
import { fetchPurchases } from '@/services/inventoryPurchaseService';
import PurchaseInvoiceModal from './PurchaseInvoiceModal';

interface Props {
    inventory: InventoryItem[];
    addedBy: string;
}

const filterInput = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' };

export default function PurchaseHistoryTab({ inventory, addedBy }: Props) {
    const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const load = async () => {
        setLoading(true);
        setPurchases(await fetchPurchases());
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        return purchases.filter(p => {
            if (fromDate && (p.purchase_date || '') < fromDate) return false;
            if (toDate && (p.purchase_date || '') > toDate) return false;
            if (search) {
                const txt = `${p.part_code || ''} ${p.part_name || ''} ${p.supplier || ''} ${p.invoice_no || ''}`.toLowerCase();
                if (!txt.includes(search.toLowerCase())) return false;
            }
            return true;
        });
    }, [purchases, search, fromDate, toDate]);

    const totalQty = filtered.reduce((s, p) => s + (p.qty || 0), 0);
    const totalVal = filtered.reduce((s, p) => s + (p.qty || 0) * (p.unit_cost || 0), 0);

    const clearFilters = () => { setSearch(''); setFromDate(''); setToDate(''); };

    return (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Purchase History</h2>
                <button onClick={() => setModalOpen(true)} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ New Purchase</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Part code, name, supplier, invoice..." style={{ ...filterInput, flex: 1, minWidth: 200 }} />
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="From date" style={filterInput} />
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} title="To date" style={filterInput} />
                <button onClick={clearFilters} style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>✕ Clear</button>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{filtered.length} records | Qty: {totalQty} | Total: ₹{Math.round(totalVal).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#f9fafb' }}>
                            {['Date', 'Part Code', 'Part Name', 'Supplier', 'Qty', 'Unit Cost', 'Total', 'Invoice No', 'By'].map(h => (
                                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>Loading...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No purchase records</td></tr>
                        ) : filtered.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '8px 10px' }}>{p.purchase_date || '-'}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{p.part_code || '-'}</td>
                                <td style={{ padding: '8px 10px' }}>{p.part_name || '-'}</td>
                                <td style={{ padding: '8px 10px' }}>{p.supplier || '-'}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{p.qty || 0}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹{p.unit_cost || 0}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>₹{((p.qty || 0) * (p.unit_cost || 0)).toFixed(0)}</td>
                                <td style={{ padding: '8px 10px' }}>{p.invoice_no || '-'}</td>
                                <td style={{ padding: '8px 10px' }}>{p.added_by || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <PurchaseInvoiceModal
                    inventory={inventory}
                    addedBy={addedBy}
                    onClose={() => setModalOpen(false)}
                    onSaved={load}
                />
            )}
        </div>
    );
}