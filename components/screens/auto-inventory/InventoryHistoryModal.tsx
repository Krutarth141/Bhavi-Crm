'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { AutoInventoryItem, AutoInventoryLog } from '@/types/autoInventory';
import { fetchAutoInventoryLogs } from '@/services/autoInventoryService';

interface Props {
    item: AutoInventoryItem;
    onClose: () => void;
}

const TYPE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
    in: { bg: '#dcfce7', color: '#065f46', label: '⬇️ IN' },
    out: { bg: '#fee2e2', color: '#dc2626', label: '⬆️ OUT' },
    sell: { bg: '#fef3c7', color: '#92400e', label: '💰 SELL' },
};

export default function InventoryHistoryModal({ item, onClose }: Props) {
    const [logs, setLogs] = useState<AutoInventoryLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAutoInventoryLogs(item.id).then(l => { setLogs(l); setLoading(false); });
    }, [item.id]);

    const totIn = logs.filter(l => l.type === 'in').reduce((a, l) => a + (l.qty || 0), 0);
    const totOut = logs.filter(l => l.type === 'out').reduce((a, l) => a + (l.qty || 0), 0);
    const totSell = logs.filter(l => l.type === 'sell').reduce((a, l) => a + (l.qty || 0), 0);

    return (
        <Modal isOpen title={`📋 ${item.item_name} — IN/OUT History`} onClose={onClose}>
            {loading ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: 30 }}>Loading...</p>
            ) : !logs.length ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>📭 No transaction records found.<br /><small>Records will appear once stock is updated.</small></div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                        {[
                            { label: 'Total IN', value: `+${totIn}`, color: '#065f46' },
                            { label: 'Total OUT', value: `-${totOut}`, color: '#dc2626' },
                            { label: 'Total Sold', value: String(totSell), color: '#d97706' },
                        ].map(k => (
                            <div key={k.label} style={{ border: `1px solid ${k.color}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
                                <div style={{ fontSize: 11, color: '#6b7280' }}>{k.label}</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 640 }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    {['Date', 'Type', 'Qty', 'Party (Dealer/Customer)', 'Invoice', 'Price/Unit', 'Note', 'By'].map(h => (
                                        <th key={h} style={{ padding: 8, textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(l => {
                                    const badge = TYPE_BADGE[l.type] || { bg: '#f3f4f6', color: '#374151', label: l.type };
                                    return (
                                        <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{(l.txn_date || l.created_at) ? new Date(l.txn_date || l.created_at!).toLocaleDateString('en-IN') : '-'}</td>
                                            <td style={{ padding: 8 }}><span style={{ background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{badge.label}</span></td>
                                            <td style={{ padding: 8, textAlign: 'center', fontWeight: 700 }}>{l.qty || 0}</td>
                                            <td style={{ padding: 8 }}>{l.dealer_name || l.customer_name || '—'}</td>
                                            <td style={{ padding: 8 }}>{l.invoice_no || '—'}</td>
                                            <td style={{ padding: 8 }}>{l.price_per_unit ? `₹${Number(l.price_per_unit).toLocaleString('en-IN')}` : '—'}</td>
                                            <td style={{ padding: 8, color: '#6b7280' }}>{l.note || '—'}</td>
                                            <td style={{ padding: 8, color: '#6b7280' }}>{l.done_by || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Modal>
    );
}