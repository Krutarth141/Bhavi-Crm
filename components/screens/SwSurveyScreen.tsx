'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import {
    SW_ITEM_DEFS, SW_MODULE_SIZES, SwSurvey, SwSurveyData, SwRoom, SwBoard,
    swNewRoom, swNewBoard, swBoardTotal, swRoomTotal, swSurveyTotal,
} from '@/types/swSurvey';
import { fetchSwSurveys, saveSwSurvey, deleteSwSurvey, fetchSwSurveysBySite } from '@/services/swSurveyService';
import { fetchSites } from '@/services/autoSitesService';
import { AutoSite } from '@/types/autoSites';
import { fetchCompanyInfo } from '@/services/settingsService';

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' as const };

export default function SwSurveyScreen() {
    const { data: session } = useSession();
    const myName = (session?.user as any)?.name ?? '';

    const [surveys, setSurveys] = useState<SwSurvey[]>([]);
    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState<AutoSite[]>([]);

    const [editing, setEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [clientName, setClientName] = useState('');
    const [siteName, setSiteName] = useState('');
    const [siteId, setSiteId] = useState<number | null>(null);
    const [surveyDate, setSurveyDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [rooms, setRooms] = useState<SwRoom[]>([]);
    const [saving, setSaving] = useState(false);
    const [siteSurveyNote, setSiteSurveyNote] = useState('');
    const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
    // index.html:20392-20403 — swSave()/swSaveNow(): edits autosave 700ms after
    // the last change instead of requiring an explicit Save click.
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const skipAutosaveRef = useRef(false);

    const load = useCallback(async () => {
        setLoading(true);
        const [s, st] = await Promise.all([fetchSwSurveys(), fetchSites()]);
        setSurveys(s); setSites(st);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        skipAutosaveRef.current = true;
        setSaveStatus('idle');
        setEditId(null);
        setClientName(''); setSiteName(''); setSiteId(null); setSurveyDate(new Date().toLocaleDateString('en-CA'));
        setRooms([swNewRoom('Room 1')]);
        setCustomInputs({});
        setSiteSurveyNote('');
        setEditing(true);
    };

    const openEdit = (s: SwSurvey) => {
        skipAutosaveRef.current = true;
        setSaveStatus('idle');
        setSiteSurveyNote('');
        setEditId(s.id);
        setClientName(s.client_name || ''); setSiteName(s.site_name || ''); setSiteId(s.site_id ?? null); setSurveyDate(s.survey_date || new Date().toLocaleDateString('en-CA'));
        setRooms((s.data?.rooms && s.data.rooms.length ? s.data.rooms : [swNewRoom('Room 1')]));
        setCustomInputs({});
        setEditing(true);
    };

    // Mirrors HTML's swOpenSiteSurvey() (index.html:20255-20262): picking a site
    // opens that site's EXISTING survey if one is already on file, instead of
    // silently creating a duplicate blank one. Only when there is none does the
    // form stay on "new", pre-filled from the site.
    const handleSiteSelect = async (id: string) => {
        skipAutosaveRef.current = true;
        setSiteSurveyNote('');
        if (!id) {
            setSiteId(null);
            return;
        }
        const numId = Number(id);
        setSiteId(numId);
        const site = sites.find((x) => x.id === numId);
        const existing = await fetchSwSurveysBySite(numId);
        if (existing.length) {
            const s = existing[0];
            setEditId(s.id);
            setClientName(s.client_name || site?.client_name || '');
            setSiteName(s.site_name || site?.site_name || '');
            setSurveyDate(s.survey_date || new Date().toLocaleDateString('en-CA'));
            setRooms(s.data?.rooms && s.data.rooms.length ? s.data.rooms : [swNewRoom('Room 1')]);
            setCustomInputs({});
            setSiteSurveyNote('📂 Aa site nu survey pehlethi chhe — ae j kholyu. Save karso to aej update thashe.');
            return;
        }
        if (site) { setClientName(site.client_name || ''); setSiteName(site.site_name || ''); }
    };

    const handleDelete = async (s: SwSurvey) => {
        if (!confirm(`Delete survey for ${s.client_name || '(unnamed)'}?`)) return;
        const r = await deleteSwSurvey(s.id);
        if (!r.success) alert('Error: ' + r.error); else await load();
    };

    const addRoom = () => setRooms(r => [...r, swNewRoom(`Room ${r.length + 1}`)]);
    const removeRoom = (roomId: string) => { if (!confirm('Remove this room?')) return; setRooms(r => r.filter(x => x.id !== roomId)); };
    const renameRoom = (roomId: string, name: string) => setRooms(r => r.map(x => x.id === roomId ? { ...x, name } : x));

    const addBoard = (roomId: string) => setRooms(r => r.map(x => x.id === roomId ? { ...x, boards: [...x.boards, swNewBoard(`SW${x.boards.length + 1}`)] } : x));
    const removeBoard = (roomId: string, boardId: string) => setRooms(r => r.map(x => x.id === roomId ? { ...x, boards: x.boards.filter(b => b.id !== boardId) } : x));
    const renameBoard = (roomId: string, boardId: string, name: string) => setRooms(r => r.map(x => x.id === roomId ? { ...x, boards: x.boards.map(b => b.id === boardId ? { ...b, name } : b) } : x));
    const relocateBoard = (roomId: string, boardId: string, location: string) => setRooms(r => r.map(x => x.id === roomId ? { ...x, boards: x.boards.map(b => b.id === boardId ? { ...b, location } : b) } : x));
    const bumpItem = (roomId: string, boardId: string, key: string, delta: number) => setRooms(r => r.map(x => x.id === roomId ? {
        ...x, boards: x.boards.map(b => b.id === boardId ? { ...b, items: { ...b.items, [key]: Math.max(0, (b.items[key] || 0) + delta) } } : b),
    } : x));

    // index.html:20383 swBoardType / 20385 swBoardSize
    const setBoardType = (roomId: string, boardId: string, type: string) => setRooms(r => r.map(x => x.id === roomId ? {
        ...x, boards: x.boards.map(b => b.id === boardId ? { ...b, type: type as SwBoard['type'] } : b),
    } : x));
    const setBoardSize = (roomId: string, boardId: string, moduleCount: string) => setRooms(r => r.map(x => x.id === roomId ? {
        ...x, boards: x.boards.map(b => b.id === boardId ? { ...b, moduleCount } : b),
    } : x));

    // index.html:20387-20389 swAddCust / swCustDelta / swDelCust
    const addCustomItem = (roomId: string, boardId: string) => {
        const key = `${roomId}:${boardId}`;
        const name = (customInputs[key] || '').trim();
        if (!name) return;
        setRooms(r => r.map(x => x.id === roomId ? {
            ...x, boards: x.boards.map(b => b.id === boardId ? { ...b, custom: [...(b.custom || []), { name, qty: 1 }] } : b),
        } : x));
        setCustomInputs(ci => ({ ...ci, [key]: '' }));
    };
    const bumpCustomItem = (roomId: string, boardId: string, index: number, delta: number) => setRooms(r => r.map(x => x.id === roomId ? {
        ...x, boards: x.boards.map(b => b.id === boardId ? {
            ...b, custom: (b.custom || []).map((c, i) => i === index ? { ...c, qty: Math.max(0, (c.qty || 0) + delta) } : c),
        } : b),
    } : x));
    const removeCustomItem = (roomId: string, boardId: string, index: number) => setRooms(r => r.map(x => x.id === roomId ? {
        ...x, boards: x.boards.map(b => b.id === boardId ? { ...b, custom: (b.custom || []).filter((_, i) => i !== index) } : b),
    } : x));

    // index.html:20392-20403 — debounced autosave, 700ms after the last edit.
    // Skipped once right after opening/switching survey (skipAutosaveRef) so
    // loading an existing survey doesn't immediately re-PATCH it.
    useEffect(() => {
        if (!editing) return;
        if (skipAutosaveRef.current) { skipAutosaveRef.current = false; return; }
        if (!clientName.trim()) return;
        setSaveStatus('saving');
        const t = setTimeout(async () => {
            const data: SwSurveyData = { rooms };
            const r = await saveSwSurvey(editId, clientName.trim(), siteName.trim(), surveyDate, data, myName, siteId);
            if (r.success) { if (!editId && r.id) setEditId(r.id); setSaveStatus('saved'); }
            else setSaveStatus('error');
        }, 700);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing, clientName, siteName, siteId, surveyDate, rooms]);

    const handleSave = async () => {
        if (!clientName.trim()) { alert('Client name is required.'); return; }
        setSaving(true);
        const data: SwSurveyData = { rooms };
        const r = await saveSwSurvey(editId, clientName.trim(), siteName.trim(), surveyDate, data, myName, siteId);
        setSaving(false);
        if (!r.success) { alert('Error saving: ' + r.error); return; }
        setEditing(false);
        await load();
    };

    // index.html:20406-20436 swExport() — Board details + Room summary sheets.
    const downloadSurveyExcel = (s: SwSurvey) => {
        const roomsData = s.data?.rooms || [];
        const header = ['Room', 'Switchboard', 'Type', 'Location', 'Board size (M)'].concat(SW_ITEM_DEFS.map(d => d.label)).concat(['Other items', 'Total items']);
        const rows: any[] = [header];
        roomsData.forEach(r => {
            (r.boards || []).forEach(b => {
                const row: (string | number)[] = [r.name, b.name, b.type || 'Automation', b.location || '', b.moduleCount || ''];
                SW_ITEM_DEFS.forEach(d => row.push(b.items?.[d.key] || 0));
                const cust = (b.custom || []).map(c => `${c.name} x${c.qty}`).join(', ');
                row.push(cust);
                row.push(swBoardTotal(b));
                rows.push(row);
            });
        });
        const totalRow: (string | number)[] = ['TOTAL', '', '', '', ''];
        SW_ITEM_DEFS.forEach(d => {
            let sum = 0;
            roomsData.forEach(r => (r.boards || []).forEach(b => { sum += b.items?.[d.key] || 0; }));
            totalRow.push(sum);
        });
        totalRow.push(''); totalRow.push(swSurveyTotal(s.data));
        rows.push(totalRow);
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Board details');
        const summary: any[] = [['Room', 'Switchboards', 'Items']];
        roomsData.forEach(r => summary.push([r.name || '', (r.boards || []).length, swRoomTotal(r)]));
        summary.push(['Grand total', '', swSurveyTotal(s.data)]);
        const ws2 = XLSX.utils.aoa_to_sheet(summary);
        XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
        XLSX.writeFile(wb, `SW_Survey_${(s.client_name || 'survey').replace(/[^A-Za-z0-9]/g, '_')}.xlsx`);
    };

    const downloadSurveyPDF = async (s: SwSurvey) => {
        const win = window.open('', '_blank', 'width=900,height=1000');
        if (!win) { alert('Popup blocked — please allow popups in your browser'); return; }
        const ci = await fetchCompanyInfo();
        const coName = ci?.company_name || 'Bhavi Electronics & Automation';
        const logo = ci?.logo_url || '';
        const esc = (x?: string) => (x || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const rooms = s.data?.rooms || [];
        const itemTotals: Record<string, number> = Object.fromEntries(SW_ITEM_DEFS.map(d => [d.key, 0]));
        let boards = 0;
        rooms.forEach(r => (r.boards || []).forEach(b => {
            boards++;
            SW_ITEM_DEFS.forEach(d => { itemTotals[d.key] += b.items?.[d.key] || 0; });
        }));
        const grand = swSurveyTotal(s.data);
        const itemHead = SW_ITEM_DEFS.map(d => `<th class="c">${esc(d.label)}</th>`).join('');
        const trs = rooms.flatMap(r => (r.boards || []).map(b => {
            const cust = (b.custom || []).map(c => `${esc(c.name)} x${c.qty}`).join(', ');
            const cells = `<td>${esc(r.name)}</td><td>${esc(b.name)}</td><td>${esc(b.type || 'Automation')}</td><td>${esc(b.location)}</td><td class="c">${esc(b.moduleCount)}</td>`
                + SW_ITEM_DEFS.map(d => `<td class="c">${b.items?.[d.key] || ''}</td>`).join('')
                + `<td>${cust}</td><td class="c b">${swBoardTotal(b)}</td>`;
            return `<tr>${cells}</tr>`;
        })).join('');
        const totCells = `<td class="b">TOTAL</td><td></td><td></td><td></td><td></td>`
            + SW_ITEM_DEFS.map(d => `<td class="c b">${itemTotals[d.key] || ''}</td>`).join('')
            + `<td></td><td class="c b">${grand}</td>`;
        const dstr = s.survey_date ? new Date(s.survey_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SW Survey - ${esc(s.client_name)}</title>
<style>*{box-sizing:border-box;} body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:0;padding:18px 22px;font-size:12px;}
.hd{display:flex;align-items:center;gap:14px;border-bottom:2px solid #0891b2;padding-bottom:10px;margin-bottom:12px;}
.hd img{max-height:56px;max-width:180px;object-fit:contain;}
.co{font-size:19px;font-weight:800;color:#0f172a;} .sub{font-size:12px;color:#0891b2;font-weight:700;margin-top:3px;}
.chips{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;}
.chip{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:8px 14px;text-align:center;}
.cv{font-size:16px;font-weight:800;color:#0891b2;} .cl{font-size:10px;color:#64748b;margin-top:2px;}
table{width:100%;border-collapse:collapse;font-size:11px;}
th,td{border:1px solid #e2e8f0;padding:5px 6px;text-align:left;}
th{background:#f0f9ff;font-weight:700;} .c{text-align:center;} .b{font-weight:700;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>
<div class="hd">${logo ? `<img src="${logo}">` : ''}<div><div class="co">${esc(coName)}</div><div class="sub">🔌 Switchboard Survey Report</div></div></div>
<div class="chips">
<div class="chip"><div class="cv">${esc(s.client_name)}</div><div class="cl">Client</div></div>
${s.site_name ? `<div class="chip"><div class="cv">${esc(s.site_name)}</div><div class="cl">Site</div></div>` : ''}
${dstr ? `<div class="chip"><div class="cv">${dstr}</div><div class="cl">Survey Date</div></div>` : ''}
<div class="chip"><div class="cv">${rooms.length}</div><div class="cl">Rooms</div></div>
<div class="chip"><div class="cv">${boards}</div><div class="cl">Switchboards</div></div>
<div class="chip"><div class="cv">${grand}</div><div class="cl">Total Items</div></div>
</div>
<table><thead><tr><th>Room</th><th>Switchboard</th><th>Type</th><th>Location</th><th>Size (M)</th>${itemHead}<th>Other items</th><th>Total</th></tr></thead>
<tbody>${trs}<tr>${totCells}</tr></tbody></table>
<script>window.onload=function(){window.print();};</script>
</body></html>`;
        win.document.write(html);
        win.document.close();
    };

    if (editing) {
        return (
            <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🔌 {editId ? 'Edit' : 'New'} Switchboard Survey</h1>
                        {/* index.html:20275 #sw-save-ind */}
                        <div style={{ fontSize: 11, marginTop: 2, color: saveStatus === 'error' ? '#dc2626' : saveStatus === 'saving' ? '#d97706' : '#16a34a' }}>
                            {saveStatus === 'saving' ? '… saving' : saveStatus === 'error' ? '⚠️ Save failed' : saveStatus === 'saved' ? '✓ Saved' : ' '}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditing(false)} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>← Back</button>
                        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save Survey'}</button>
                    </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                        <label style={{ fontSize: 12, fontWeight: 700 }}>Auto Site (optional)</label>
                        <select value={siteId ?? ''} onChange={e => handleSiteSelect(e.target.value)} style={fieldStyle}>
                            <option value="">— Not linked —</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.client_name} — {s.site_name}</option>)}
                        </select>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                            Site pasand karo to teni sathe survey link thashe (already survey hoy to aej khulshe).
                        </div>
                    </div>
                    {/* Client name locks once a site is chosen — the site's own
                        client is authoritative (index.html:20200). */}
                    <div style={{ flex: 1, minWidth: 160 }}>
                        <label style={{ fontSize: 12, fontWeight: 700 }}>Client Name *</label>
                        <input
                            type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                            disabled={siteId != null}
                            style={{ ...fieldStyle, background: siteId != null ? '#f1f5f9' : undefined }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}><label style={{ fontSize: 12, fontWeight: 700 }}>Site Name</label><input type="text" value={siteName} onChange={e => setSiteName(e.target.value)} style={fieldStyle} /></div>
                    <div style={{ width: 160 }}><label style={{ fontSize: 12, fontWeight: 700 }}>Survey Date</label><input type="date" value={surveyDate} onChange={e => setSurveyDate(e.target.value)} style={fieldStyle} /></div>
                    {siteSurveyNote && (
                        <div style={{ flexBasis: '100%', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#1e40af' }}>
                            {siteSurveyNote}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Total Items: <span style={{ color: '#185FA5' }}>{swSurveyTotal({ rooms })}</span></div>
                    <button onClick={addRoom} style={{ padding: '6px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Add Room</button>
                </div>

                {rooms.map(room => (
                    <div key={room.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                            <input type="text" value={room.name} onChange={e => renameRoom(room.id, e.target.value)} style={{ ...fieldStyle, flex: 1, fontWeight: 700 }} placeholder="Room name" />
                            <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>Total: <b>{swRoomTotal(room)}</b></span>
                            <button onClick={() => addBoard(room.id)} style={{ padding: '5px 10px', border: '1px solid #185FA5', color: '#185FA5', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>+ Board</button>
                            {rooms.length > 1 && <button onClick={() => removeRoom(room.id)} style={{ padding: '5px 10px', border: '1px solid #dc2626', color: '#dc2626', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑</button>}
                        </div>

                        {room.boards.map((board: SwBoard) => {
                            const isAuto = (board.type || 'Automation') === 'Automation';
                            const accent = isAuto ? '#0891b2' : '#d97706';
                            const total = swBoardTotal(board);
                            const overCapacity = board.moduleCount ? total > Number(board.moduleCount) : false;
                            const custKey = `${room.id}:${board.id}`;
                            return (
                                <div key={board.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                        <input type="text" value={board.name} onChange={e => renameBoard(room.id, board.id, e.target.value)} style={{ ...fieldStyle, width: 120 }} placeholder="Board name" />
                                        {/* index.html:20354 swBoardType select */}
                                        <select value={board.type || 'Automation'} onChange={e => setBoardType(room.id, board.id, e.target.value)} title="Automation / Non-Automation" style={{ ...fieldStyle, width: 150, fontWeight: 700, color: accent }}>
                                            <option value="Automation">⚙️ Automation</option>
                                            <option value="Non-Automation">🔧 Non-Auto</option>
                                        </select>
                                        <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center', whiteSpace: 'nowrap' }}>Total: <b>{total}</b></span>
                                        {room.boards.length > 1 && <button onClick={() => removeBoard(room.id, board.id)} style={{ padding: '4px 8px', border: '1px solid #dc2626', color: '#dc2626', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>🗑</button>}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                        <input type="text" value={board.location} onChange={e => relocateBoard(room.id, board.id, e.target.value)} style={{ ...fieldStyle, flex: 1, minWidth: 120 }} placeholder="📍 Location (near door, etc.)" />
                                        {/* index.html:20323-20325 sizeSel + used indicator */}
                                        <select value={board.moduleCount || ''} onChange={e => setBoardSize(room.id, board.id, e.target.value)} style={{ ...fieldStyle, width: 140 }}>
                                            {SW_MODULE_SIZES.map(v => <option key={v} value={v}>{v === '' ? 'Board size' : `${v} Module`}</option>)}
                                        </select>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: overCapacity ? '#dc2626' : '#64748b', alignSelf: 'center', whiteSpace: 'nowrap' }}>
                                            {board.moduleCount ? `used ${total} / ${board.moduleCount}` : `used ${total}`}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                                        {SW_ITEM_DEFS.map(d => (
                                            <div key={d.key} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 8px' }}>
                                                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{d.label}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <button onClick={() => bumpItem(room.id, board.id, d.key, -1)} style={{ width: 24, height: 24, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>−</button>
                                                    <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{board.items[d.key] || 0}</span>
                                                    <button onClick={() => bumpItem(room.id, board.id, d.key, 1)} style={{ width: 24, height: 24, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>+</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* index.html:20342-20349 custom items */}
                                    {(board.custom || []).length > 0 && (
                                        <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                                            {board.custom.map((c, ci) => (
                                                <div key={ci} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#faf5ff', borderRadius: 6, padding: '6px 8px' }}>
                                                    <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>{c.name}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <button onClick={() => bumpCustomItem(room.id, board.id, ci, -1)} style={{ width: 24, height: 24, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>−</button>
                                                        <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{c.qty || 0}</span>
                                                        <button onClick={() => bumpCustomItem(room.id, board.id, ci, 1)} style={{ width: 24, height: 24, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>+</button>
                                                        <button onClick={() => removeCustomItem(room.id, board.id, ci)} style={{ width: 22, height: 22, border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>✕</button>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                        <input
                                            type="text" placeholder="Other item name…" value={customInputs[custKey] || ''}
                                            onChange={e => setCustomInputs(ci => ({ ...ci, [custKey]: e.target.value }))}
                                            onKeyDown={e => { if (e.key === 'Enter') addCustomItem(room.id, board.id); }}
                                            style={{ ...fieldStyle, flex: 1 }}
                                        />
                                        <button onClick={() => addCustomItem(room.id, board.id)} style={{ padding: '6px 14px', border: '1px solid #185FA5', color: '#185FA5', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Add</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>🔌 Switchboard Survey ({surveys.length})</h1>
                <button onClick={openCreate} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ New Survey</button>
            </div>
            {/* index.html:20180 — intro line under the header */}
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: -8, marginBottom: 14 }}>Create a survey per client / site — fill in room-wise switchboard counts, and export to Excel. Can also be opened from an Auto Site.</p>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : surveys.length === 0 ? <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', padding: 40, color: '#9ca3af' }}>🔌 No surveys yet. Click &quot;New Survey&quot; to add one!</div>
                    : (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {surveys.map(s => (
                                <div key={s.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700 }}>{s.client_name || '(unnamed)'}{s.site_name ? ` — ${s.site_name}` : ''}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.survey_date ? `📅 ${s.survey_date} • ` : ''}{(s.data?.rooms || []).length} rooms • {swSurveyTotal(s.data)} items</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => openEdit(s)} style={{ padding: '6px 12px', border: '1px solid #185FA5', color: '#185FA5', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>✏️ Edit</button>
                                        <button onClick={() => downloadSurveyExcel(s)} style={{ padding: '6px 12px', border: '1px solid #059669', color: '#059669', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>⬇️ Excel</button>
                                        <button onClick={() => downloadSurveyPDF(s)} style={{ padding: '6px 12px', border: '1px solid #dc2626', color: '#dc2626', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🧾 PDF</button>
                                        <button onClick={() => handleDelete(s)} style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
        </div>
    );
}