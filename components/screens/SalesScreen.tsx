'use client';

import { useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { SalesOrder, SALES_STATUSES } from '@/types/sales';

const statusColor: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fef3c7', color: '#92400e' },
    confirmed: { bg: '#dbeafe', color: '#1e40af' },
    dispatched: { bg: '#ede9fe', color: '#5b21b6' },
    delivered: { bg: '#d1fae5', color: '#065f46' },
    cancelled: { bg: '#fee2e2', color: '#991b1b' },
};

export default function SalesScreen() {
    const { orders, loading, error, totalRevenue, updateStatus } = useSales();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const filtered: SalesOrder[] = orders.filter(o => {
        const q = search.toLowerCase();
        const matchSearch = !search.trim() || o.customer_name?.toLowerCase().includes(q) || o.order_no?.toLowerCase().includes(q) || o.customer_mobile?.includes(q);
        const matchStatus = !statusFilter || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const handleStatusChange = async (id: string, status: string) => {
        if (!confirm(`Change status to "${status}"?`)) return;
        const r = await updateStatus(id, status);
        if (!r.success) alert('Error: ' + r.error);
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>💼 Sales Orders ({orders.length})</h1>
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>₹{totalRevenue.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Total Revenue</div>
                </div>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
                {SALES_STATUSES.map(s => {
                    const count = orders.filter(o => o.status === s).length;
                    const sc = statusColor[s] || { bg: '#f3f4f6', color: '#374151' };
                    return (
                        <div key={s} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', textAlign: 'center', cursor: 'pointer', outline: statusFilter === s ? '2px solid #185FA5' : 'none' }} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: sc.color }}>{count}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' }}>{s}</div>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Search customer, order no, mobile..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All Status</option>
                    {SALES_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>{filtered.length} / {orders.length}</span>
            </div>

            {/* Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                    : filtered.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No sales orders found</p>
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            {['Order No', 'Customer', 'Amount', 'Payment', 'Courier/AWB', 'Status', 'Action'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(o => {
                                            const sc = statusColor[o.status || ''] || { bg: '#f3f4f6', color: '#374151' };
                                            return (
                                                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{o.order_no || o.id.slice(0, 8)}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                                                        {o.customer_mobile && <div style={{ fontSize: 11, color: '#6b7280' }}>{o.customer_mobile}</div>}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#059669' }}>₹{(o.total_amount || 0).toLocaleString()}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>
                                                        <div>{o.payment_method || '—'}</div>
                                                        {o.payment_reference && <div style={{ color: '#6b7280', fontSize: 11 }}>{o.payment_reference}</div>}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12 }}>
                                                        <div>{o.courier_name || '—'}</div>
                                                        {o.awb_number && <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#185FA5' }}>{o.awb_number}</div>}
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>{o.status || '—'}</span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <select
                                                            value={o.status || ''}
                                                            onChange={e => handleStatusChange(o.id, e.target.value)}
                                                            style={{ padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                                                        >
                                                            {SALES_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </td>
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