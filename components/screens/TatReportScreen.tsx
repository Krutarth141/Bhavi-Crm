'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useEngineers } from '@/hooks/useEngineers';
import { loadTatReport, TatReportRow } from '@/services/tatReportService';

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' as const };

const monthStart = () => { const d = new Date(); d.setDate(1); return d.toLocaleDateString('en-CA'); };
const today = () => new Date().toLocaleDateString('en-CA');

export default function TatReportScreen() {
    const { engineers } = useEngineers();
    const [from, setFrom] = useState(monthStart());
    const [to, setTo] = useState(today());
    const [engFilter, setEngFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'' | 'within' | 'outside'>('');
    const [rows, setRows] = useState<TatReportRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const search = async () => {
        setLoading(true);
        try { setRows(await loadTatReport(from, to, engFilter, statusFilter)); }
        catch (e: any) { alert('Error: ' + e.message); }
        setLoading(false);
        setSearched(true);
    };

    useEffect(() => { search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const withinCount = rows.filter(r => r.withinTAT).length;
    const outsideCount = rows.length - withinCount;
    const pct = rows.length ? Math.round(withinCount / rows.length * 100) : 0;

    const byEng: Record<string, { within: number; outside: number }> = {};
    rows.forEach(r => {
        const k = r.eng || 'Unassigned';
        if (!byEng[k]) byEng[k] = { within: 0, outside: 0 };
        if (r.withinTAT) byEng[k].within++; else byEng[k].outside++;
    });
    const engRows = Object.entries(byEng).sort((a, b) => (b[1].within + b[1].outside) - (a[1].within + a[1].outside));

    const fmtDT = (d: Date) => d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

    const downloadExcel = () => {
        if (!rows.length) { alert('Please search first'); return; }
        const data = rows.map(r => ({
            Ticket: r.id, Customer: r.cname || '-', Mobile: r.mobile || '-', Model: r.model || '-', Engineer: r.eng || '-',
            'TAT Deadline': r.deadline.toLocaleString('en-IN'), 'Closed At': r.closedAt.toLocaleString('en-IN'),
            Status: r.withinTAT ? 'Within TAT' : 'Outside TAT',
            'Hours Early/Late': Math.round(r.diffHrs * 10) / 10,
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'TAT Compliance');
        XLSX.writeFile(wb, `tat_compliance_${new Date().toLocaleDateString('en-CA')}.xlsx`);
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <h1 style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 700 }}>⏱️ TAT Compliance Report</h1>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
                    <div><label style={{ fontSize: 12, fontWeight: 700 }}>Closed From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={fieldStyle} /></div>
                    <div><label style={{ fontSize: 12, fontWeight: 700 }}>Closed To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} style={fieldStyle} /></div>
                    <div><label style={{ fontSize: 12, fontWeight: 700 }}>Engineer</label>
                        <select value={engFilter} onChange={e => setEngFilter(e.target.value)} style={fieldStyle}>
                            <option value="">All Engineers</option>
                            {engineers.map(e => <option key={e.id} value={e.user_id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div><label style={{ fontSize: 12, fontWeight: 700 }}>TAT Status</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as '' | 'within' | 'outside')} style={fieldStyle}>
                            <option value="">All</option>
                            <option value="within">✅ Within TAT</option>
                            <option value="outside">⚠️ Outside TAT</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={search} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🔍 Search</button>
                    <button onClick={downloadExcel} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📊 Excel Download</button>
                </div>
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : !searched ? null
                    : rows.length === 0 ? <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 20, textAlign: 'center', color: '#1d4ed8' }}>No closed calls with a TAT found for this filter.</div>
                        : (
                            <>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                                    <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 16px' }}><div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>Total Closed (with TAT)</div><div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{rows.length}</div></div>
                                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 16px', border: '1px solid #bbf7d0' }}><div style={{ fontSize: 11, color: '#0e9f6e', fontWeight: 700 }}>Within TAT</div><div style={{ fontSize: 20, fontWeight: 800, color: '#0e9f6e' }}>{withinCount} <span style={{ fontSize: 14 }}>({pct}%)</span></div></div>
                                    <div style={{ background: '#fef2f2', borderRadius: 10, padding: '10px 16px', border: '1px solid #fecaca' }}><div style={{ fontSize: 11, color: '#f05252', fontWeight: 700 }}>Outside TAT</div><div style={{ fontSize: 20, fontWeight: 800, color: '#f05252' }}>{outsideCount}</div></div>
                                </div>

                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                                    <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>👷 Per Engineer</h3>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead><tr style={{ background: '#f8fafc' }}>
                                                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Engineer</th>
                                                <th style={{ padding: '6px 8px' }}>Within TAT</th>
                                                <th style={{ padding: '6px 8px' }}>Outside TAT</th>
                                                <th style={{ padding: '6px 8px' }}>Total</th>
                                                <th style={{ padding: '6px 8px' }}>Compliance %</th>
                                            </tr></thead>
                                            <tbody>
                                                {engRows.map(([name, d]) => {
                                                    const tot = d.within + d.outside;
                                                    const p = tot ? Math.round(d.within / tot * 100) : 0;
                                                    return (
                                                        <tr key={name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '6px 8px', fontWeight: 700 }}>{name}</td>
                                                            <td style={{ padding: '6px 8px', textAlign: 'center', color: '#0e9f6e', fontWeight: 700 }}>{d.within}</td>
                                                            <td style={{ padding: '6px 8px', textAlign: 'center', color: '#f05252', fontWeight: 700 }}>{d.outside}</td>
                                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{tot}</td>
                                                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{p}%</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
                                    <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>📋 Call Details</h3>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                                <th style={{ padding: '6px 8px' }}>Ticket</th>
                                                <th style={{ padding: '6px 8px' }}>Customer</th>
                                                <th style={{ padding: '6px 8px' }}>Mobile</th>
                                                <th style={{ padding: '6px 8px' }}>Model</th>
                                                <th style={{ padding: '6px 8px' }}>Engineer</th>
                                                <th style={{ padding: '6px 8px' }}>TAT Deadline</th>
                                                <th style={{ padding: '6px 8px' }}>Closed At</th>
                                                <th style={{ padding: '6px 8px' }}>Status</th>
                                            </tr></thead>
                                            <tbody>
                                                {rows.slice().sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime()).map(r => (
                                                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '6px 8px', fontWeight: 700 }}>{r.id}</td>
                                                        <td style={{ padding: '6px 8px' }}>{r.cname || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{r.mobile ? <a href={`tel:${r.mobile}`} style={{ color: '#185FA5' }}>📞 {r.mobile}</a> : '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{r.model || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{r.eng || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{fmtDT(r.deadline)}</td>
                                                        <td style={{ padding: '6px 8px' }}>{fmtDT(r.closedAt)}</td>
                                                        <td style={{ padding: '6px 8px' }}>
                                                            {r.withinTAT
                                                                ? <span style={{ color: '#0e9f6e', fontWeight: 700 }}>✅ Within TAT</span>
                                                                : <span style={{ color: '#f05252', fontWeight: 700 }}>⚠️ {Math.round(Math.abs(r.diffHrs))}h Late</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
        </div>
    );
}