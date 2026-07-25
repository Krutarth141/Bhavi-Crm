'use client';

import { useEffect, useMemo, useState } from 'react';
import { InventoryItem, InventorySale } from '@/types/inventory';
import { fetchSales } from '@/services/inventorySaleService';
import ManualSaleModal from './ManualSaleModal';

interface Props {
    inventory: InventoryItem[];
    addedBy: string;
}

const filterInput = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' };

const typeBadgeStyle = (t: string) => {
    if (t === 'call') return { background: '#dbeafe', color: '#1d4ed8' };
    if (t === 'dealer') return { background: '#fef3c7', color: '#92400e' };
    return { background: '#d1fae5', color: '#065f46' };
};

export default function SalesHistoryTab({ inventory, addedBy }: Props) {
    const [sales, setSales] = useState<InventorySale[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const load = async () => {
        setLoading(true);
        setSales(await fetchSales());
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        return sales.filter(s => {
            if (typeFilter && s.sale_type !== typeFilter) return false;
            if (fromDate && (s.sale_date || '') < fromDate) return false;
            if (toDate && (s.sale_date || '') > toDate) return false;
            if (search) {
                const txt = `${s.part_code || ''} ${s.part_name || ''} ${s.customer_name || ''} ${s.reference || ''}`.toLowerCase();
                if (!txt.includes(search.toLowerCase())) return false;
            }
            return true;
        });
    }, [sales, search, typeFilter, fromDate, toDate]);

    const totalQty = filtered.reduce((s, r) => s + (r.qty || 0), 0);
    const totalVal = filtered.reduce((s, r) => s + (r.qty || 0) * (r.unit_price || 0), 0);

    const clearFilters = () => { setSearch(''); setTypeFilter(''); setFromDate(''); setToDate(''); };

    return (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Sales History</h2>
                <button onClick={() => setModalOpen(true)} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Manual Sale</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Part code, name, customer, reference..." style={{ ...filterInput, flex: 1, minWidth: 200 }} />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={filterInput}>
                    <option value="">All Types</option>
                    <option value="call">Call</option>
                    <option value="dealer">Dealer</option>
                    <option value="customer">Customer</option>
                </select>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="From date" style={filterInput} />
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} title="To date" style={filterInput} />
                <button onClick={clearFilters} style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>✕ Clear</button>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{filtered.length} records | Qty: {totalQty} | Total: ₹{Math.round(totalVal).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#f9fafb' }}>
                            {['Date', 'Part Code', 'Part Name', 'Type', 'Reference', 'Qty', 'Unit Price', 'Total', 'By'].map(h => (
                                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>Loading...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No sales records</td></tr>
                        ) : filtered.map(s => {
                            const typeLabel = s.sale_type === 'call' ? `Call: ${s.reference || ''}` : s.sale_type === 'dealer' ? `Dealer: ${s.customer_name || ''}` : `Customer: ${s.customer_name || ''}`;
                            return (
                                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '8px 10px' }}>{s.sale_date || '-'}</td>
                                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{s.part_code || '-'}</td>
                                    <td style={{ padding: '8px 10px' }}>{s.part_name || '-'}</td>
                                    <td style={{ padding: '8px 10px' }}><span style={{ ...typeBadgeStyle(s.sale_type), padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{s.sale_type || '-'}</span></td>
                                    <td style={{ padding: '8px 10px' }}>{typeLabel}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{s.qty || 0}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹{s.unit_price || 0}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>₹{((s.qty || 0) * (s.unit_price || 0)).toFixed(0)}</td>
                                    <td style={{ padding: '8px 10px' }}>{s.added_by || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <ManualSaleModal
                    inventory={inventory}
                    addedBy={addedBy}
                    onClose={() => setModalOpen(false)}
                    onSaved={load}
                />
            )}
        </div>
    );
}