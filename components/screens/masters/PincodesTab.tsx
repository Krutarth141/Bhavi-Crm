'use client';

import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { fetchPincodeCount, importPincodes } from '@/services/masterService';

interface PreviewRow { pincode: string; area: string; district: string; state: string }

export default function PincodesTab() {
    const [count, setCount] = useState(0);
    const [rows, setRows] = useState<PreviewRow[]>([]);
    const [status, setStatus] = useState('');
    const [busy, setBusy] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const loadCount = async () => {
        try { setCount(await fetchPincodeCount()); } catch { }
    };
    useEffect(() => { loadCount(); }, []);

    const downloadTemplate = () => {
        const data = [
            { pincode: '395001', area: 'Surat City', district: 'Surat', state: 'Gujarat' },
            { pincode: '395002', area: 'Athwa', district: 'Surat', state: 'Gujarat' },
            { pincode: '380001', area: 'Ahmedabad City', district: 'Ahmadabad', state: 'Gujarat' },
        ];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pincodes');
        XLSX.writeFile(wb, 'pincode_template.xlsx');
    };

    const handleFile = () => {
        const file = fileRef.current?.files?.[0];
        if (!file) { setRows([]); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target?.result, { type: 'binary' });
                const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { raw: false, defval: '' });
                const parsed: PreviewRow[] = json.map(r => {
                    const keys = Object.keys(r);
                    const get = (n: string) => { const k = keys.find(k => k.trim().toLowerCase() === n); return k ? String(r[k]).trim() : ''; };
                    return { pincode: get('pincode'), area: get('area'), district: get('district'), state: get('state') };
                }).filter(r => r.pincode && /^\d{6}$/.test(r.pincode));
                setRows(parsed);
            } catch (ex: any) {
                setStatus(`File parse error: ${ex.message}`);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async (clearFirst: boolean) => {
        if (!rows.length) { alert('Please select a file first.'); return; }
        if (clearFirst && !confirm('ALL existing pincodes will be deleted from Supabase and replaced with the new file. Are you sure?')) return;
        setBusy(true);
        setStatus('⏳ Starting...');
        try {
            const done = await importPincodes(rows, clearFirst);
            setStatus(`✅ Import complete! ${done.toLocaleString('en-IN')} records added/updated.`);
            await loadCount();
            setRows([]);
            if (fileRef.current) fileRef.current.value = '';
        } catch (e: any) {
            setStatus(`❌ Error: ${e.message}`);
        } finally {
            setBusy(false);
        }
    };

    const states: Record<string, number> = {};
    rows.forEach(r => { states[r.state] = (states[r.state] || 0) + 1; });

    return (
        <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>📍 Pincode Data</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, background: '#f8fafc', padding: '10px 12px', borderRadius: 8 }}>
                <b>Format:</b> File must have 4 columns: <code>pincode</code>, <code>area</code>, <code>district</code>, <code>state</code><br />
                Accepted: <b>.csv</b> or <b>.xlsx / .xls</b> &nbsp;|&nbsp; Current records: <b>{count.toLocaleString('en-IN')}</b>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>📄 Template Download</button>
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Select File</label>
                <input type="file" ref={fileRef} accept=".csv,.xlsx,.xls" style={{ display: 'block', marginTop: 6 }} onChange={handleFile} />
            </div>
            {rows.length > 0 && (
                <div style={{ marginBottom: 12, fontSize: 13, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px' }}>
                    ✅ <b>{rows.length.toLocaleString('en-IN')} valid rows</b> found &nbsp;·&nbsp; {Object.entries(states).map(([s, n]) => `${s}: ${n.toLocaleString('en-IN')}`).join(' | ')}
                </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" disabled={busy} onClick={() => handleImport(false)}>📥 Add / Update Records</button>
                <button className="btn" style={{ background: '#dc2626', color: '#fff' }} disabled={busy} onClick={() => handleImport(true)}>🗑️ Clear All &amp; Reimport</button>
            </div>
            {status && <div style={{ marginTop: 12, fontSize: 13 }}>{status}</div>}
        </div>
    );
}