'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import { useEngineers } from '@/hooks/useEngineers';
import { isCspManager } from '@/lib/permissions';
import { fetchKmReport, setOfficeLocation, editKmReading, KmReportResult } from '@/services/kmTrackingService';
import { supabase } from '@/lib/supabase';

const todayStr = () => new Date().toLocaleDateString('en-CA');
const TYPE_LABEL: Record<string, string> = { opening: '🏢 Day Start (Opening)', arrival: '📍 Reached Customer', closing: '🏁 Day End (Closing)' };

export default function KmTrackingScreen() {
    const { data: session } = useSession();
    const roleType = (session?.user as any)?.roleType;
    const cspMgr = isCspManager(session);
    const isEngOnly = roleType === 'engineer' && !cspMgr;
    const dbRole = (session?.user as any)?.role;
    const isAdmin = dbRole === 'admin' || cspMgr;
    const isTrueAdmin = dbRole === 'admin';
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
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

    // index.html:25711 — ticket ID in each row is clickable (viewTicket()).
    const [viewTicket, setViewTicket] = useState<any | null>(null);
    const [viewTicketLoading, setViewTicketLoading] = useState(false);
    const openTicket = async (id: string) => {
        setViewTicketLoading(true);
        setViewTicket({ id });
        const { data } = await supabase.from('tickets').select('id, cname, mobile, model, status, problem, assigned_name, call_type, service_type').eq('id', id).maybeSingle();
        setViewTicket(data || { id, notFound: true });
        setViewTicketLoading(false);
    };

    // Accepts explicit from/to so callers that just changed the date range
    // (quick()) can fetch the new range immediately, rather than scheduling a
    // load() that would close over the pre-change from/to still in scope at
    // call time (setFrom/setTo don't land until the next render).
    const load = async (f: string = from, t: string = to) => {
        setLoading(true);
        try {
            const eng = isEngOnly ? myEngId : engFilter;
            setResult(await fetchKmReport(f, t, eng || undefined));
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const quick = (kind: 'today' | 'week' | 'month') => {
        const today = new Date();
        let f = today.toLocaleDateString('en-CA');
        const t = f;
        if (kind === 'week') { const d = new Date(today); d.setDate(today.getDate() - today.getDay() + 1); f = d.toLocaleDateString('en-CA'); }
        else if (kind === 'month') { f = t.substring(0, 8) + '01'; }
        setFrom(f); setTo(t);
        load(f, t);
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

    // Mirrors HTML's _buildKmSheet() (index.html:25816-25843): one aoa_to_sheet
    // per engineer group with Engineer/Date/Total-KM/Start/End merged down
    // each day's row-span, real column widths, and a FINAL TOTAL row.
    const buildKmSheet = (groups: KmReportResult['groups']) => {
        const stripEmoji = (s?: string) => (s || '').replace(/^\S+\s/, '');
        const header = ['Engineer', 'Date', 'Time', 'Type', 'Ticket', 'Area', 'Odometer', 'Segment KM', 'Total KM', 'Start Location', 'End Location'];
        const aoa: any[][] = [header];
        const merges: any[] = [];
        let grand = 0;
        groups.forEach((g) => {
            const startRow = aoa.length;
            const entryRows = g.entries.length ? g.entries.map((l) => [
                l.captured_at ? new Date(l.captured_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-',
                TYPE_LABEL[l.entry_type]?.replace(/^\S+\s/, '') || l.entry_type,
                (l.ticket_id && String(l.ticket_id).startsWith('FT')) ? 'Other Work' : (l.ticket_id || ''),
                l.area || '',
                l.odometer_km ?? '',
                l.segmentKm ?? '',
            ]) : [['-', '-', '', '', '', '']];
            entryRows.forEach((r, idx) => {
                aoa.push([
                    idx === 0 ? g.eng_name : '',
                    idx === 0 ? g.dateLabel : '',
                    r[0], r[1], r[2], r[3], r[4], r[5],
                    idx === 0 ? g.totalKm : '',
                    idx === 0 ? stripEmoji(g.startLabel) : '',
                    idx === 0 ? stripEmoji(g.endLabel) : '',
                ]);
            });
            const endRow = aoa.length - 1;
            if (endRow > startRow) {
                merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } });
                merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } });
                merges.push({ s: { r: startRow, c: 8 }, e: { r: endRow, c: 8 } });
                merges.push({ s: { r: startRow, c: 9 }, e: { r: endRow, c: 9 } });
                merges.push({ s: { r: startRow, c: 10 }, e: { r: endRow, c: 10 } });
            }
            grand += g.totalKm || 0;
        });
        const finalRow = aoa.length;
        aoa.push(['FINAL TOTAL', '', '', '', '', '', '', '', grand, '', '']);
        merges.push({ s: { r: finalRow, c: 0 }, e: { r: finalRow, c: 7 } });
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!merges'] = merges;
        ws['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 11 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
        return ws;
    };

    // Mirrors HTML's downloadKmReport() (index.html:25844-25873): one sheet
    // per engineer for admin/CSP-manager/WC views (_kmrIsMultiView=!isEng),
    // a single sheet only when an engineer views their own report.
    const downloadExcel = () => {
        if (!result || !result.groups.length) { alert('No data to download — load the report first.'); return; }
        const wb = XLSX.utils.book_new();
        if (!isEngOnly) {
            const byEng = new Map<string, { name: string; groups: KmReportResult['groups'] }>();
            const order: string[] = [];
            result.groups.forEach((g) => {
                const key = g.eng_id || g.eng_name;
                if (!byEng.has(key)) { byEng.set(key, { name: g.eng_name, groups: [] }); order.push(key); }
                byEng.get(key)!.groups.push(g);
            });
            const usedNames = new Set<string>();
            order.forEach((key) => {
                const eg = byEng.get(key)!;
                const ws = buildKmSheet(eg.groups);
                const base = (eg.name || 'Engineer').replace(/[[\]*?/\\:]/g, '').slice(0, 28) || 'Engineer';
                let sheetName = base, n = 2;
                while (usedNames.has(sheetName)) { sheetName = `${base} (${n})`; n++; }
                usedNames.add(sheetName);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });
        } else {
            const ws = buildKmSheet(result.groups);
            XLSX.utils.book_append_sheet(wb, ws, 'KM Report');
        }
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
                <button onClick={() => load()} disabled={loading} style={{ height: 34, padding: '0 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🔍 {loading ? 'Loading...' : 'Load'}</button>
                <button onClick={() => quick('today')} style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Today</button>
                <button onClick={() => quick('week')} style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>This Week</button>
                <button onClick={() => quick('month')} style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>This Month</button>
                <button onClick={downloadExcel} style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>⬇️ Excel</button>
                {isTrueAdmin && (
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
                                                        {l.ticket_id && String(l.ticket_id).startsWith('FT') ? (
                                                            <span style={{ color: '#7c3aed', fontWeight: 700 }}>🚚 Other Work</span>
                                                        ) : l.ticket_id ? (
                                                            <>
                                                                <a onClick={() => openTicket(l.ticket_id as string)} style={{ color: '#1d4ed8', fontWeight: 600, cursor: 'pointer' }}>{l.ticket_id}</a>
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
                                                    <td style={{ padding: 8, textAlign: 'center' }}>{l.photo_url ? <button title="View odometer photo" onClick={() => setLightboxSrc(l.photo_url as string)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>👁️</button> : '—'}</td>
                                                    <td style={{ padding: 8, textAlign: 'center' }}>{l.lat && l.lng ? <a href={`https://maps.google.com/?q=${l.lat},${l.lng}`} target="_blank" rel="noreferrer">📍</a> : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}

            {lightboxSrc && (
                <div onClick={() => setLightboxSrc(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <img src={lightboxSrc} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} alt="Odometer photo" />
                </div>
            )}

            {viewTicket && (
                <div onClick={() => setViewTicket(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🎫 {viewTicket.id}</h3>
                            <button onClick={() => setViewTicket(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                        </div>
                        {viewTicketLoading ? (
                            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
                        ) : viewTicket.notFound ? (
                            <div style={{ padding: 12, color: '#6b7280', fontSize: 13 }}>Ticket not found.</div>
                        ) : (
                            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div><b>Customer:</b> {viewTicket.cname || '—'}{viewTicket.mobile ? ` | ${viewTicket.mobile}` : ''}</div>
                                <div><b>Model:</b> {viewTicket.model || '—'}</div>
                                <div><b>Status:</b> {viewTicket.status || '—'}</div>
                                <div><b>Type:</b> {viewTicket.call_type || '—'} | {viewTicket.service_type || '—'}</div>
                                <div><b>Assigned:</b> {viewTicket.assigned_name || '—'}</div>
                                {viewTicket.problem && <div><b>Problem:</b> {viewTicket.problem}</div>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}