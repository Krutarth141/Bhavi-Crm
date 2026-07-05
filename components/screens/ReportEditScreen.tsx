'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import {
    CALL_TYPES, SERVICE_TYPES, IMPORT_STATUSES,
    ImportRow, validateRow, importTickets,
} from '@/services/reportEditService';

export default function ReportEditScreen() {
    const { data: session } = useSession();
    const userName = (session?.user as any)?.name ?? 'Admin';
    const userId = (session?.user as any)?.user_id ?? 'ADMIN001';

    const [preview, setPreview] = useState<ImportRow[]>([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
    const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');

    const downloadTemplate = () => {
        const sample = [{
            'Customer Name': 'Ramesh Shah', 'Mobile': '9876543210', 'Brand': 'Canon',
            'Model': 'EOS R50', 'Serial No': 'SN123456', 'Problem': 'Camera not turning on',
            'Call Type': 'Non-Warranty', 'Service Type': 'Carry In',
            'Status': 'In Progress', 'Engineer Name': 'Shailesh',
            'Address': '123 Street, Ahmedabad', 'PIN': '380015', 'Remarks': '',
        }];
        const ws = XLSX.utils.json_to_sheet(sample);
        ws['!cols'] = Array(13).fill({ wch: 18 });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tickets');

        const inst = [
            { Field: 'Customer Name', Required: 'Yes', Notes: 'Full name' },
            { Field: 'Mobile', Required: 'Yes', Notes: '10 digit number' },
            { Field: 'Call Type', Required: 'Yes', Notes: CALL_TYPES.join(' / ') },
            { Field: 'Service Type', Required: 'Yes', Notes: 'Carry In / On Site' },
            { Field: 'Status', Required: 'Yes', Notes: IMPORT_STATUSES.slice(0, 3).join(' / ') + ' ...' },
            { Field: 'Brand', Required: 'No', Notes: 'e.g. Canon, Fujifilm' },
            { Field: 'Model', Required: 'No', Notes: 'Device model' },
            { Field: 'Serial No', Required: 'No', Notes: 'Device serial number' },
            { Field: 'Engineer Name', Required: 'No', Notes: 'Must match existing engineer name exactly' },
            { Field: 'Address', Required: 'No', Notes: 'Customer address' },
            { Field: 'PIN', Required: 'No', Notes: '6-digit PIN code' },
        ];
        const ws2 = XLSX.utils.json_to_sheet(inst);
        XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
        XLSX.writeFile(wb, 'ticket_import_template.xlsx');
    };

    const handleFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows: any[] = XLSX.utils.sheet_to_json(ws);
                setPreview(rows.slice(0, 200).map((r, i) => validateRow(r, i + 2)));
                setStep('preview');
            } catch (err) { alert('Error reading file: ' + (err as any).message); }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        setImporting(true);
        const r = await importTickets(preview, userId, userName);
        setResult(r);
        setStep('done');
        setImporting(false);
    };

    const validCount = preview.filter(r => r.valid).length;
    const invalidCount = preview.filter(r => !r.valid).length;

    return (
        <div style={{ padding: '20px 24px' }}>
            <h1 style={{ margin: '0 0 24px', fontSize: 28, fontWeight: 700 }}>📥 Import Calls</h1>

            {step === 'upload' && (
                <div>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 16, marginBottom: 20, fontSize: 13, color: '#1e40af' }}>
                        <strong>How to import:</strong>
                        <ol style={{ margin: '8px 0 0', paddingLeft: 16 }}>
                            <li>Download the Excel template below</li>
                            <li>Fill in ticket data using exact dropdown values</li>
                            <li>Upload the filled file</li>
                            <li>Review preview → click Import</li>
                        </ol>
                    </div>

                    <button onClick={downloadTemplate} style={{ display: 'block', marginBottom: 20, padding: '10px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                        📄 Download Template
                    </button>

                    <div
                        style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: 48, textAlign: 'center', cursor: 'pointer', background: '#f9fafb' }}
                        onClick={() => document.getElementById('import-input')?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                    >
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Click or drag Excel file here</div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>.xlsx or .xls — max 200 rows</div>
                    </div>
                    <input id="import-input" type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </div>
            )}

            {step === 'preview' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ color: '#059669', fontWeight: 600, fontSize: 14 }}>✅ {validCount} valid</span>
                            {invalidCount > 0 && <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 14 }}>❌ {invalidCount} invalid</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => { setPreview([]); setStep('upload'); }} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'white' }}>← Back</button>
                            <button onClick={handleImport} disabled={importing || validCount === 0} style={{ padding: '8px 18px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: (importing || validCount === 0) ? 0.6 : 1 }}>
                                {importing ? 'Importing...' : `📥 Import ${validCount} Calls`}
                            </button>
                        </div>
                    </div>

                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                        {['Row', 'Customer', 'Mobile', 'Brand/Model', 'Call Type', 'Service', 'Status', 'Engineer', 'Issues'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map(r => (
                                        <tr key={r.row} style={{ borderBottom: '1px solid #f3f4f6', background: r.valid ? 'white' : '#fff5f5' }}>
                                            <td style={{ padding: '8px 12px', fontSize: 11, color: '#6b7280' }}>{r.row}</td>
                                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.cname || '—'}</td>
                                            <td style={{ padding: '8px 12px', fontSize: 12 }}>{r.mobile || '—'}</td>
                                            <td style={{ padding: '8px 12px', fontSize: 12 }}>{r.brand_name} {r.model}</td>
                                            <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.call_type}</td>
                                            <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.service_type}</td>
                                            <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.status}</td>
                                            <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.assigned_name || '—'}</td>
                                            <td style={{ padding: '8px 12px', fontSize: 11, color: '#dc2626' }}>
                                                {r.errors.length > 0 ? r.errors.join(', ') : <span style={{ color: '#059669' }}>✅</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {step === 'done' && result && (
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                    <h2 style={{ margin: '0 0 8px' }}>Import Complete!</h2>
                    <div style={{ fontSize: 20, color: '#059669', fontWeight: 700 }}>{result.success} calls imported</div>
                    {result.errors > 0 && <div style={{ color: '#dc2626', marginTop: 4 }}>{result.errors} failed</div>}
                    <button onClick={() => { setStep('upload'); setPreview([]); setResult(null); }} style={{ marginTop: 24, padding: '10px 24px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                        📥 Import More
                    </button>
                </div>
            )}
        </div>
    );
}