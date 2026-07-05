'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAutoVisitsReport } from '@/services/autoVisitsReportService';
import { AutoSiteVisitReport } from '@/types/autoVisitsReport';
import * as XLSX from 'xlsx';

const todayStr = () => new Date().toLocaleDateString('en-CA');
const monthStart = () => new Date().toISOString().slice(0, 7) + '-01';

export default function AutoVisitsReportScreen() {
    const [from, setFrom] = useState(monthStart());
    const [to, setTo] = useState(todayStr());
    const [visits, setVisits] = useState<AutoSiteVisitReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const data = await fetchAutoVisitsReport(from, to);
        setVisits(data);
        setLoading(false);
    }, [from, to]);

    useEffect(() => { load(); }, [load]);

    const filtered = visits.filter(v => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return v.site_name?.toLowerCase().includes(q) || v.client_name?.toLowerCase().includes(q) || v.created_by_name?.toLowerCase().includes(q);
    });

    const exportExcel = () => {
        const rows = filtered.map(v => ({
            'Date': v.visit_date,
            'Site': v.site_name,
            'Client': v.client_name,
            'Work Done': v.work_done,
            'Material': v.material_delivered,
            'Material ₹': v.material_total || 0,
            'By': v.created_by_name,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Site Visits');
        XLSX.writeFile(wb, `auto_visits_${from}_${to}.xlsx`);
    };

    // Stats
    const uniqueSites = new Set(visits.map(v => v.site_id)).size;
    const totalMaterial = visits.reduce((s, v) => s + (v.material_total || 0), 0);

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🏗️ Auto Site Visits Report</h1>
                <button onClick={exportExcel} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>📊 Export Excel</button>
            </div>

            {/* Filters */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 3 }}>From</label>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 3 }}>To</label>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                </div>
                <input type="text" placeholder="Search site, client, engineer..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, minWidth: 220, fontFamily: 'inherit' }} />
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Visits', value: String(visits.length), color: '#185FA5' },
                    { label: 'Sites Visited', value: String(uniqueSites), color: '#7c3aed' },
                    { label: 'Material Value', value: '₹' + totalMaterial.toLocaleString('en-IN', { maximumFractionDigits: 0 }), color: '#059669' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                    : filtered.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No visits found for this period</p>
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            {['Date', 'Site', 'Client', 'Work Done', 'Material Delivered', 'Material ₹', 'By'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(v => (
                                            <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '10px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>{v.visit_date || '—'}</td>
                                                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{v.site_name || '—'}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12 }}>{v.client_name || '—'}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, maxWidth: 200 }}>{v.work_done || '—'}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', maxWidth: 180 }}>{v.material_delivered || '—'}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#059669' }}>{v.material_total ? `₹${v.material_total}` : '—'}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12 }}>{v.created_by_name || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
            </div>
        </div>
    );
}