'use client';

import { useEffect, useMemo, useState } from 'react';
import { InventoryItem } from '@/types/inventory';
import { fetchInventoryLogs, fetchTicketUsage, TicketPartUsage } from '@/services/inventoryHistoryService';
import { InventoryLogEntry } from '@/types/inventory';

interface Props {
    item: InventoryItem;
    onClose: () => void;
}

type Tab = 'log' | 'tickets';

const kpiCard = (borderColor: string) => ({ padding: 12, border: `1px solid ${borderColor}`, borderRadius: 8, background: '#fff' });
const kpiLabel = { fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const };
const kpiValue = (color: string) => ({ fontSize: 20, fontWeight: 800, color, marginTop: 4 });

export default function PartHistoryModal({ item, onClose }: Props) {
    const [tab, setTab] = useState<Tab>('log');
    const [logs, setLogs] = useState<InventoryLogEntry[]>([]);
    const [tickets, setTickets] = useState<TicketPartUsage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        if (tab === 'log') {
            fetchInventoryLogs(item.id).then(d => { setLogs(d); setLoading(false); });
        } else {
            if (!item.part_code) { setTickets([]); setLoading(false); return; }
            fetchTicketUsage(item.part_code).then(d => { setTickets(d); setLoading(false); });
        }
    }, [tab, item.id, item.part_code]);

    const totIn = useMemo(() => logs.filter(l => l.type === 'in').reduce((a, l) => a + (l.qty || 0), 0), [logs]);
    const totOut = useMemo(() => logs.filter(l => l.type === 'out').reduce((a, l) => a + (l.qty || 0), 0), [logs]);
    const totSell = useMemo(() => logs.filter(l => l.type === 'sell').reduce((a, l) => a + (l.qty || 0), 0), [logs]);
    const wQty = item.warranty_qty || 0;
    const purQty = Math.max(0, (item.qty_in_stock || 0) - wQty);

    const totalCalls = tickets.length;
    const totalQtyUsed = useMemo(() => tickets.reduce((a, t) => a + (t.qty || 0), 0), [tickets]);
    const totalValue = useMemo(() => tickets.reduce((a, t) => a + (t.qty || 0) * (t.price || 0), 0), [tickets]);

    const tabBtn = (key: Tab, label: string): React.CSSProperties => ({
        padding: '10px 18px', fontSize: 13, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
        borderBottom: tab === key ? '2px solid #185FA5' : '2px solid transparent',
        color: tab === key ? '#185FA5' : '#64748b', marginBottom: -2,
    });

    const typeBadge = (t: string) => {
        if (t === 'in') return { background: '#dcfce7', color: '#065f46', label: '⬇️ IN' };
        if (t === 'sell') return { background: '#fef3c7', color: '#92400e', label: '💰 SELL' };
        return { background: '#fee2e2', color: '#dc2626', label: '⬆️ OUT' };
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: 0, fontSize: 17 }}>📋 {item.item_name} — History</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', padding: '0 16px', background: '#f9fafb' }}>
                    <button style={tabBtn('log', 'Log')} onClick={() => setTab('log')}>📦 IN/OUT/Sell Log</button>
                    {item.part_code && <button style={tabBtn('tickets', 'Tickets')} onClick={() => setTab('tickets')}>🔧 Ticket Usage</button>}
                </div>
                <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading...</div>
                    ) : tab === 'log' ? (
                        logs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>📭 No transaction records found.<br /><small>Records will appear once stock is adjusted.</small></div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
                                    <div style={kpiCard('#065f46')}><div style={kpiLabel}>Total IN</div><div style={kpiValue('#065f46')}>+{totIn}</div></div>
                                    <div style={kpiCard('#dc2626')}><div style={kpiLabel}>Total OUT</div><div style={kpiValue('#dc2626')}>-{totOut}</div></div>
                                    <div style={kpiCard('#d97706')}><div style={kpiLabel}>Total Sold</div><div style={kpiValue('#d97706')}>{totSell}</div></div>
                                    <div style={kpiCard('#1d4ed8')}><div style={kpiLabel}>🛒 Purchase Stock</div><div style={kpiValue('#1d4ed8')}>{purQty}</div></div>
                                    <div style={kpiCard('#059669')}><div style={kpiLabel}>🏭 Warranty Stock</div><div style={kpiValue('#059669')}>{wQty}</div></div>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb' }}>
                                                {['Date', 'Type', 'Qty', 'Party', 'Invoice', 'Price/Unit', 'Note', 'By'].map(h => (
                                                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.map(l => {
                                                const b = typeBadge(l.type);
                                                return (
                                                    <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                        <td style={{ padding: '8px 10px' }}>{(l.txn_date || l.created_at) ? new Date(l.txn_date || l.created_at!).toLocaleDateString('en-IN') : '-'}</td>
                                                        <td style={{ padding: '8px 10px' }}><span style={{ background: b.background, color: b.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{b.label}</span></td>
                                                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{l.qty || 0}</td>
                                                        <td style={{ padding: '8px 10px' }}>{l.supplier || l.customer_name || '—'}</td>
                                                        <td style={{ padding: '8px 10px' }}>{l.invoice_no || '—'}</td>
                                                        <td style={{ padding: '8px 10px' }}>{l.price_per_unit ? `₹${Number(l.price_per_unit).toLocaleString('en-IN')}` : '—'}</td>
                                                        <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 12 }}>{l.note || '—'}</td>
                                                        <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 12 }}>{l.done_by || '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )
                    ) : (
                        tickets.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Not used in any ticket</div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                                    <div style={kpiCard('#e2e8f0')}><div style={kpiLabel}>Total Calls</div><div style={kpiValue('#1e293b')}>{totalCalls}</div></div>
                                    <div style={kpiCard('#7c3aed')}><div style={kpiLabel}>Total Qty Used</div><div style={kpiValue('#7c3aed')}>{totalQtyUsed}</div></div>
                                    <div style={kpiCard('#0e9f6e')}><div style={kpiLabel}>Total Value</div><div style={kpiValue('#0e9f6e')}>₹{totalValue.toFixed(0)}</div></div>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb' }}>
                                                {['Ticket', 'Customer', 'Model', 'Engineer', 'Qty', 'Price', 'Total', 'Stock', 'Date', 'Status'].map(h => (
                                                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tickets.map(t => (
                                                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{t.id}</td>
                                                    <td style={{ padding: '8px 10px' }}>{t.cname || '-'}</td>
                                                    <td style={{ padding: '8px 10px' }}>{t.model || '-'}</td>
                                                    <td style={{ padding: '8px 10px' }}>{t.assigned_name || '-'}</td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{t.qty}</td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹{t.price}</td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>₹{t.qty * t.price}</td>
                                                    <td style={{ padding: '8px 10px' }}>{t.stock_deducted ? <span style={{ background: '#dcfce7', color: '#065f46', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Deducted</span> : <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Pending</span>}</td>
                                                    <td style={{ padding: '8px 10px' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '-'}</td>
                                                    <td style={{ padding: '8px 10px' }}>{t.status || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}