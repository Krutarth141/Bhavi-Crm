'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import { useEngineers } from '@/hooks/useEngineers';
import { isCspManager } from '@/lib/permissions';
import { fetchKmReport, setOfficeLocation, editKmReading, KmReportResult } from '@/services/kmTrackingService';

const todayStr = () => new Date().toLocaleDateString('en-CA');
const TYPE_LABEL: Record<string, string> = { opening: '🏢 Day Start (Opening)', arrival: '📍 Reached Customer', closing: '🏁 Day End (Closing)' };

export default function KmTrackingScreen() {
    const { data: session } = useSession();
    const roleType = (session?.user as any)?.roleType;
    const cspMgr = isCspManager(session);
    const isEngOnly = roleType === 'engineer' && !cspMgr;
    const isAdmin = roleType === 'admin';
    const myEngId = (session?.user as any)?.email ?? '';
    const myName = (session?.user as any)?.name ?? '';

    const { engineers } = useEngineers();

    const [from, setFrom] = useState(todayStr());
    const [to, setTo] = useState(todayStr());
    const [engFilter, setEngFilter] = useState('');
    const [rate, setRate] = useState('3');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<KmReportResult | null>(null);
    const [settingOffice, setSettingOffice] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const eng = isEngOnly ? myEngId : engFilter;
            setResult(await fetchKmReport(from, to, eng || undefined));
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
        setLoading(false);
    };

    const quick = (kind: 'today' | 'week' | 'month') => {
        const today = new Date();
        let f = today.toLocaleDateString('en-CA');
        const t = f;
        if (kind === 'week') { const d = new Date(today); d.setDate(today.getDate() - today.getDay() + 1); f = d.toLocaleDateString('en-CA'); }
        else if (kind === 'month') { f = t.substring(0, 8) + '01'; }
        setFrom(f); setTo(t);
        setTimeout(load, 0);
    };

    const handleSetOffice = async () => {
        if (!confirm('🏢 Are you standing at the office right now?\n\nThis GPS location will be saved as "Office" — used to label each day\'s Opening KM as Office/Away in this report.')) return;
        setSettingOffice(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const r = await setOfficeLocation(pos.coords.latitude, pos.coords.longitude);
                setSettingOffice(false);
                if (r.success) { alert('✅ Office location saved!'); load(); }
                else alert('❌ ' + r.error);
            },
            () => { setSettingOffice(false); alert('❌ Could not get location. Check GPS/location permission.'); },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    const handleEdit = async (id: number, curKm: number) => {
        const nv = prompt('New odometer reading (KM):', String(curKm || ''));
        if (nv === null) return;
        const num = parseFloat(nv);
        if (isNaN(num) || num < 0) { alert('⚠️ Enter a valid number.'); return; }
        const remark = prompt('Reason for edit (required):', '');
        if (remark === null) return;
        if (!remark.trim()) { alert('⚠️ Remark is required.'); return; }
        const r = await editKmReading(id, num, remark.trim(), myName);
        if (r.success) load(); else alert('Error: ' + r.error);
    };

    const grandKm = result?.grandKm || 0;
    const petrol = Math.round(grandKm * (parseFloat(rate) || 0) * 100) / 100;

    const downloadExcel = () => {
        if (!result || !result.groups.length) { alert('No data to download — load the report first.'); return; }
        const rows: any[] = [];
        result.groups.forEach((g) => {
            g.entries.forEach((l, idx) => {
                rows.push({
                    Engineer: idx === 0 ? g.eng_name : '',
                    Date: idx === 0 ? g.dateLabel : '',
                    Time: l.captured_at ? new Date(l.captured_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
                    Type: TYPE_LABEL[l.entry_type]?.replace(/^\S+\s/, '') || l.entry_type,
                    Ticket: l.ticket_id || '',
                    Area: l.area || '',
                    Odometer: l.odometer_km ?? '',
                    'Segment KM': l.segmentKm ?? '',
                    'Total KM (day)': idx === 0 ? g.totalKm : '',
                    'Start Location': idx === 0 ? g.startLabel : '',
                    'End Location': idx === 0 ? g.endLabel : '',
                });
            });
        });
        rows.push({ Engineer: 'FINAL TOTAL', 'Total KM (day)': grandKm });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'KM Report');
        XLSX.writeFile(wb, `KM_Report_${from}_to_${to}.xlsx`);
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <h1 style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 700 }}>🛣️ KM Tracking</h1>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
                {!isEngOnly && (
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Engineer</label>
                        <select value={engFilter} onChange={(e) => setEngFilter(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, minWidth: 160 }}>
                            <option value="">All Engineers</option>
                            {engineers.map((e) => <option key={e.id} value={e.user_id}>{e.name}</option>)}
                        </select>
                    </div>
                )}
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>From</label>
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>To</label>
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} />
                </div>
                <button onClick={load} disabled={loading} style={{ height: 34, padding: '0 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🔍 {loading ? 'Loading...' : 'Load'}</button>
                <button onClick={() => quick('today')} style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Today</button>
                <button onClick={() => quick('week')} style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>This Week</button>
                <button onClick={() => quick('month')} style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>This Month</button>
                <button onClick={downloadExcel} style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>⬇️ Excel</button>
                {isAdmin && (
                    <button onClick={handleSetOffice} disabled={settingOffice} title="Stand at the office and tap this once — used to mark each day's Opening KM as Office/Away" style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>🏢 Set Office Location</button>
                )}
            </div>

            {result && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 16px' }}>
                        <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>🛣️ Total KM</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>{grandKm} km</div>
                    </div>
                    <div style={{ background: '#fef9c3', borderRadius: 10, padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: 11, color: '#a16207', fontWeight: 700, marginBottom: 2 }}>⛽ Per KM ₹</div>
                        <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} min={0} step={0.5} style={{ width: 70, fontSize: 18, fontWeight: 800, color: '#a16207', border: '1px solid #fde68a', borderRadius: 6, padding: '2px 6px', textAlign: 'center' }} />
                    </div>
                    <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 16px' }}>
                        <div style={{ fontSize: 11, color: '#c2410c', fontWeight: 700 }}>💰 Total Petrol ₹</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#c2410c' }}>₹{petrol}</div>
                    </div>
                    <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 16px' }}>
                        <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>📅 Days</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{result.dayCount}</div>
                    </div>
                    <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '10px 16px' }}>
                        <div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 700 }}>📸 Entries</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#6d28d9' }}>{result.entryCount}</div>
                    </div>
                </div>
            )}

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : !result ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Pick a date range and click Load.</div>
                    : result.groups.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No KM entries in this period</div>
                        : result.groups.map((g) => (
                            <div key={`${g.eng_id}|${g.date}`} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 800, fontSize: 15 }}>👷 {g.eng_name} <span style={{ color: '#6b7280', fontWeight: 600, fontSize: 12 }}>— {g.dateLabel}</span></div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, fontWeight: 700 }}>
                                        <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, padding: '4px 10px' }}>Opening: {g.opening ?? '—'}</span>
                                        <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '4px 10px' }}>Closing: {g.closing ?? '—'}</span>
                                        <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: 8, padding: '4px 10px' }}>Total: {g.totalKm} km</span>
                                        {g.startMapsUrl && <a href={g.startMapsUrl} target="_blank" rel="noreferrer" style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 8, padding: '4px 10px', textDecoration: 'none' }}>Start: {g.startLabel}</a>}
                                        {g.endMapsUrl && <a href={g.endMapsUrl} target="_blank" rel="noreferrer" style={{ background: '#fdf2f8', color: '#be185d', borderRadius: 8, padding: '4px 10px', textDecoration: 'none' }}>End: {g.endLabel}</a>}
                                    </div>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead><tr style={{ background: '#f8fafc' }}>
                                            <th style={{ padding: 8, textAlign: 'left' }}>Time</th>
                                            <th style={{ padding: 8, textAlign: 'left' }}>Point</th>
                                            <th style={{ padding: 8, textAlign: 'left' }}>Call</th>
                                            <th style={{ padding: 8, textAlign: 'right' }}>Odometer</th>
                                            <th style={{ padding: 8, textAlign: 'right' }}>Travel</th>
                                            <th style={{ padding: 8, textAlign: 'center' }}>Photo</th>
                                            <th style={{ padding: 8, textAlign: 'center' }}>GPS</th>
                                        </tr></thead>
                                        <tbody>
                                            {g.entries.map((l) => (
                                                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: 8 }}>{l.captured_at ? new Date(l.captured_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                    <td style={{ padding: 8 }}>{TYPE_LABEL[l.entry_type] || l.entry_type}</td>
                                                    <td style={{ padding: 8 }}>
                                                        {l.ticket_id ? (
                                                            <>
                                                                <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{l.ticket_id}</span>
                                                                {l.area && <div style={{ fontSize: 11, color: '#0d9488', fontWeight: 700 }}>📍 {l.area}</div>}
                                                            </>
                                                        ) : '—'}
                                                    </td>
                                                    <td style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>
                                                        {l.odometer_km ?? '—'}
                                                        {l.edit_remark && <span title={`Edited: ${l.edit_remark}${l.corrected_by ? ' — ' + l.corrected_by : ''}`} style={{ color: '#d97706', cursor: 'help' }}> ✎</span>}
                                                        {isAdmin && <button title="Edit reading (with remark)" onClick={() => handleEdit(l.id, l.odometer_km)} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>✏️</button>}
                                                    </td>
                                                    <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: '#0d9488' }}>{l.segmentKm == null ? '—' : `+${l.segmentKm} km`}</td>
                                                    <td style={{ padding: 8, textAlign: 'center' }}>{l.photo_url ? <button onClick={() => window.open(l.photo_url as string, '_blank')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>👁️</button> : '—'}</td>
                                                    <td style={{ padding: 8, textAlign: 'center' }}>{l.lat && l.lng ? <a href={`https://maps.google.com/?q=${l.lat},${l.lng}`} target="_blank" rel="noreferrer">📍</a> : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
        </div>
    );
}