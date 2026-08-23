'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAutoVisitsReport, visitPhotos } from '@/services/autoVisitsReportService';
import { AutoSiteVisitReport } from '@/types/autoVisitsReport';
import { fetchSites } from '@/services/autoSitesService';
import { AutoSite } from '@/types/autoSites';
import * as XLSX from 'xlsx';

const todayStr = () => new Date().toLocaleDateString('en-CA');
const fmtDate = (d?: string) => {
    if (!d) return '';
    const parts = d.split('-');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d;
};

export default function AutoVisitsReportScreen() {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState(todayStr());
    const [visits, setVisits] = useState<AutoSiteVisitReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    // Site filter dropdown, populated from auto_sites (index.html:21606).
    const [sites, setSites] = useState<AutoSite[]>([]);
    const [siteFilter, setSiteFilter] = useState('');
    // Lightbox for a clicked visit photo (index.html's _showVisitPhoto).
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    useEffect(() => { fetchSites().then(setSites).catch(() => setSites([])); }, []);

    const load = useCallback(async () => {
        setLoading(true);
        const data = await fetchAutoVisitsReport(from, to, siteFilter ? Number(siteFilter) : null);
        setVisits(data);
        setLoading(false);
    }, [from, to, siteFilter]);

    useEffect(() => { load(); }, [load]);

    const filtered = visits.filter(v => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return v.site_name?.toLowerCase().includes(q) || v.client_name?.toLowerCase().includes(q) || v.created_by_name?.toLowerCase().includes(q);
    });

    // Mirrors HTML's downloadVisitExcel() (index.html:21688-21716): an "All
    // Visits" summary sheet plus one extra sheet per site.
    const exportExcel = () => {
        if (!filtered.length) { alert('Please search first'); return; }
        const wb = XLSX.utils.book_new();
        const allRows = filtered.map(v => ({
            'Site': v.site_name,
            'Client': v.client_name,
            'Visit Date': fmtDate(v.visit_date),
            'Time': v.visit_time || '',
            'Logged By': v.created_by_name || '',
            'Work Done': v.work_done || '',
            'Material Delivered': v.material_delivered || '',
        }));
        const allWs = XLSX.utils.json_to_sheet(allRows);
        allWs['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 40 }, { wch: 35 }];
        XLSX.utils.book_append_sheet(wb, allWs, 'All Visits');

        const bySite = new Map<string, AutoSiteVisitReport[]>();
        filtered.forEach(v => {
            const k = v.site_name || '—';
            if (!bySite.has(k)) bySite.set(k, []);
            bySite.get(k)!.push(v);
        });
        bySite.forEach((svs, siteName) => {
            const siteRows = svs.map(v => ({
                'Date': fmtDate(v.visit_date),
                'Time': v.visit_time || '',
                'Work Done': v.work_done || '',
                'Material': v.material_delivered || '',
            }));
            const siteWs = XLSX.utils.json_to_sheet(siteRows);
            siteWs['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 45 }, { wch: 35 }];
            XLSX.utils.book_append_sheet(wb, siteWs, siteName.replace(/[:\\/?*[\]]/g, '').slice(0, 31));
        });

        XLSX.writeFile(wb, `site_visits_${todayStr()}.xlsx`);
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
                <div>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 3 }}>Site</label>
                    <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, minWidth: 180 }}>
                        <option value="">All Sites</option>
                        {sites.map(s => (<option key={s.id} value={s.id}>{s.site_name}</option>))}
                    </select>
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

            {/* Per-site grouped cards — mirrors HTML's bySite grouping
                (index.html:21651-21683), one card + mini-table per site
                (ad-hoc visits with no site_id each get their own card). */}
            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : filtered.length === 0 ? <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 40 }}><p style={{ textAlign: 'center', color: '#6b7280', margin: 0 }}>No visits found for this period</p></div>
                    : (() => {
                        const bySite = new Map<string, { site_name: string; client_name: string; visits: AutoSiteVisitReport[] }>();
                        filtered.forEach(v => {
                            const k = v.site_id != null ? String(v.site_id) : `adhoc_${v.id}`;
                            if (!bySite.has(k)) bySite.set(k, { site_name: v.site_name || '—', client_name: v.client_name || '—', visits: [] });
                            bySite.get(k)!.visits.push(v);
                        });
                        return Array.from(bySite.entries()).map(([k, sg]) => (
                            <div key={k} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed', marginBottom: 2 }}>🏗️ {sg.site_name}</div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>👤 {sg.client_name} &nbsp;|&nbsp; {sg.visits.length} visits</div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                                {['Date', 'Time', 'Logged By', 'Work Done', 'Material Delivered', '📷'].map(h => (
                                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sg.visits.map(v => (
                                                <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{v.visit_date || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>{v.visit_time || '—'}</td>
                                                    <td style={{ padding: '10px 12px' }}><span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{v.created_by_name || '—'}</span></td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, maxWidth: 200, whiteSpace: 'pre-wrap' }}>{v.work_done || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, maxWidth: 200, whiteSpace: 'pre-wrap' }}>{v.material_delivered || '—'}</td>
                                                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                                        {visitPhotos(v.photos).length === 0
                                                            ? <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>
                                                            : visitPhotos(v.photos).map((src, pi) => (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    key={pi} src={src} alt={`Visit photo ${pi + 1}`}
                                                                    onClick={() => setPhotoPreview(src)} title="Click to enlarge"
                                                                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1.5px solid #e5e7eb', cursor: 'pointer', margin: 2 }}
                                                                />
                                                            ))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ));
                    })()}

            {photoPreview && (
                <div
                    onClick={() => setPhotoPreview(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoPreview} alt="Visit photo" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
                </div>
            )}
        </div>
    );
}