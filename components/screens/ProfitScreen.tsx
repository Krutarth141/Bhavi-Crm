'use client';

import { useState } from 'react';
import { useProfit } from '@/hooks/useProfit';
import * as XLSX from 'xlsx';

const todayStr = () => new Date().toLocaleDateString('en-CA');
const monthStart = () => new Date().toISOString().slice(0, 7) + '-01';

export default function ProfitScreen() {
    const [from, setFrom] = useState(monthStart());
    const [to, setTo] = useState(todayStr());
    const { tickets, loading, error, totalRevenue, avgPerCall, engRevenue, monthRevenue } = useProfit(from, to);

    const exportExcel = () => {
        const rows = tickets.map(t => ({
            'Date': t.created_at?.slice(0, 10),
            'Engineer': t.assigned_name || '—',
            'Call Type': t.call_type,
            'Status': t.status,
            'Service ₹': t.service_charges || 0,
            'Labour ₹': t.labor || 0,
            'Final ₹': t.final_charges || 0,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Revenue');
        XLSX.writeFile(wb, `revenue_${from}_${to}.xlsx`);
    };

    const card = (label: string, value: string, color: string) => (
        <div key={label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
        </div>
    );

    return (
        <div style={{ padding: '20px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>💰 Revenue / Profit</h1>
                <button onClick={exportExcel} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                    📊 Export Excel
                </button>
            </div>

            {/* Date filter */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 3 }}>From</label>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 3 }}>To</label>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                </div>
                {[
                    { label: 'Today', from: todayStr(), to: todayStr() },
                    { label: 'This Week', from: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toLocaleDateString('en-CA'); })(), to: todayStr() },
                    { label: 'This Month', from: monthStart(), to: todayStr() },
                ].map(p => (
                    <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }} style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, background: 'transparent', cursor: 'pointer' }}>
                        {p.label}
                    </button>
                ))}
                {error && <span style={{ color: '#dc2626', fontSize: 13 }}>Error: {error}</span>}
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p> : (
                <>
                    {/* KPI cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                        {card('Total Revenue', '₹' + totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 }), '#059669')}
                        {card('Non-W Calls', String(tickets.length), '#185FA5')}
                        {card('Closed Calls', String(tickets.filter(t => t.status === 'Closed').length), '#7c3aed')}
                        {card('Avg per Call', '₹' + avgPerCall.toLocaleString('en-IN', { maximumFractionDigits: 0 }), '#d97706')}
                    </div>

                    {/* Engineer Revenue */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14 }}>👷 Engineer-wise Revenue</div>
                            {engRevenue.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No data</p> : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb' }}>
                                            {['Engineer', 'Calls', 'Closed', 'Service ₹', 'Parts ₹', 'Total ₹'].map(h => (
                                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#374151' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {engRevenue.map(e => (
                                            <tr key={e.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{e.name}</td>
                                                <td style={{ padding: '8px 12px' }}>{e.calls}</td>
                                                <td style={{ padding: '8px 12px', color: '#059669' }}>{e.closed}</td>
                                                <td style={{ padding: '8px 12px' }}>₹{e.service.toFixed(0)}</td>
                                                <td style={{ padding: '8px 12px' }}>₹{e.parts.toFixed(0)}</td>
                                                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#059669' }}>₹{e.total.toFixed(0)}</td>
                                            </tr>
                                        ))}
                                        {/* Total row */}
                                        <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                                            <td style={{ padding: '8px 12px' }}>Total</td>
                                            <td style={{ padding: '8px 12px' }}>{engRevenue.reduce((s, e) => s + e.calls, 0)}</td>
                                            <td style={{ padding: '8px 12px', color: '#059669' }}>{engRevenue.reduce((s, e) => s + e.closed, 0)}</td>
                                            <td style={{ padding: '8px 12px' }}>₹{engRevenue.reduce((s, e) => s + e.service, 0).toFixed(0)}</td>
                                            <td style={{ padding: '8px 12px' }}>₹{engRevenue.reduce((s, e) => s + e.parts, 0).toFixed(0)}</td>
                                            <td style={{ padding: '8px 12px', color: '#059669' }}>₹{totalRevenue.toFixed(0)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Monthly Revenue */}
                        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14 }}>📅 Monthly Revenue</div>
                            {monthRevenue.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No data</p> : (
                                <>
                                    {/* Simple bar chart */}
                                    <div style={{ padding: '12px 16px' }}>
                                        {monthRevenue.slice(-6).map(m => {
                                            const maxRev = Math.max(...monthRevenue.map(x => x.total), 1);
                                            const w = Math.round((m.total / maxRev) * 100);
                                            return (
                                                <div key={m.month} style={{ marginBottom: 8 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
                                                        <span>{m.month}</span>
                                                        <span style={{ fontWeight: 600, color: '#059669' }}>₹{m.total.toFixed(0)}</span>
                                                    </div>
                                                    <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                                                        <div style={{ height: '100%', width: w + '%', background: '#185FA5', borderRadius: 4 }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb' }}>
                                                {['Month', 'Calls', 'Service ₹', 'Parts ₹', 'Total ₹'].map(h => (
                                                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#374151' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthRevenue.map(m => (
                                                <tr key={m.month} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '8px 12px' }}>{m.month}</td>
                                                    <td style={{ padding: '8px 12px' }}>{m.calls}</td>
                                                    <td style={{ padding: '8px 12px' }}>₹{m.service.toFixed(0)}</td>
                                                    <td style={{ padding: '8px 12px' }}>₹{m.parts.toFixed(0)}</td>
                                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#059669' }}>₹{m.total.toFixed(0)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}