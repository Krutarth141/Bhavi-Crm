'use client';

import { useState, useCallback, useRef } from 'react';
import { ImportRow, ImportValidationError, VALID_IMPORT_CALL_TYPES, VALID_IMPORT_SERVICE_TYPES, VALID_IMPORT_STATUSES } from '@/types/reports';
import { validateImportRows } from '@/hooks/useReports';
import { ImportResult } from '@/services/reportsService';

interface ImportCallsTabProps {
    importRunning: boolean;
    importProgress: number;
    importTotal: number;
    importResult: ImportResult | null;
    onImport: (rows: ImportRow[], importedBy: string) => Promise<void>;
    currentUserName: string;
}

export default function ImportCallsTab({
    importRunning,
    importProgress,
    importTotal,
    importResult,
    onImport,
    currentUserName,
}: ImportCallsTabProps) {
    const [validRows, setValidRows] = useState<ImportRow[]>([]);
    const [validationErrors, setValidationErrors] = useState<ImportValidationError[]>([]);
    const [previewReady, setPreviewReady] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = useCallback(() => {
        const rows = [
            ['ticket_id', 'call_type', 'service_type', 'status', 'brand_name', 'model', 'serial', 'cname', 'mobile', 'alt_mobile', 'city', 'state', 'address', 'pin', 'area', 'problem', 'description', 'action', 'assigned_name', 'assigned_to', 'se_call_id', 'service_charges', 'final_charges', 'warranty_coverage', 'wc_type', 'rerepair', 'rerepair_foc', 'remarks', 'visit_date', 'created_at'],
            ['blank=auto generate', 'Warranty/Non-Warranty/AMC/Warranty Repeat/Non-Warranty Repeat/Other', 'Carry In / On Site', 'Pending Allocation/Assigned/In Progress/...', 'Canon/Panasonic/Fujifilm/Casio', 'Model number', 'Serial number', 'Customer full name', '10 digit mobile', 'Alternate (optional)', 'City', 'State (optional)', 'Address (optional)', 'PIN code', 'Area/locality', 'Problem description', 'Detailed notes (optional)', 'Action taken - closed only', 'Engineer exact name as in CRM', 'Engineer ID e.g. ENG001', 'Canon/SE call ID (optional)', 'Service charges Rs (number)', 'Final charges Rs (number)', 'Under Coverage/Out of Coverage/NA', 'ICP/CSP', 'No/Yes', 'FALSE/TRUE', 'Remarks (optional)', 'YYYY-MM-DD (optional)', 'YYYY-MM-DD blank=today'],
            ['blank=auto', 'Mandatory', 'Mandatory', 'Mandatory', 'Mandatory', 'Mandatory', 'Mandatory', 'Mandatory', 'Mandatory', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Mandatory', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional'],
            ['SAMPLE DELETE THIS ROW', 'Non-Warranty', 'Carry In', 'Pending Allocation', 'Canon', 'EOS R50', 'SN1234567', 'Ramesh Shah', '9898989898', '', 'Ahmedabad', 'Gujarat', 'Nr. SBI Bank Maninagar', '380008', 'Maninagar', 'Camera not turning on', '', '', '', '', 'CD2026001', '500', '', 'NA', 'ICP', 'No', 'FALSE', '', '2026-04-15', '2026-04-15'],
        ];
        const csvEsc = (v: unknown) => {
            const s = String(v == null ? '' : v);
            return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const csv = rows.map((r) => r.map(csvEsc).join(',')).join('\r\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Bhavi_CRM_Import_Template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, []);

    const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPreviewReady(false);
        setValidRows([]);
        setValidationErrors([]);

        try {
            const XLSX = await import('xlsx');
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];

            if (allRows.length < 2) {
                alert('File is empty');
                return;
            }

            const headers = allRows[0].map((h) => String(h).trim().toLowerCase());
            // Data starts row 4 (index 3), skip header/notes rows
            const dataRows = allRows.slice(3).filter((r) => r.some((c) => c !== ''));

            if (!dataRows.length) {
                alert('No data rows found — please enter data starting from Row 4');
                return;
            }

            const parsed: ImportRow[] = dataRows.map((row) => {
                const obj: Record<string, string> = {};
                headers.forEach((h, idx) => { obj[h] = String(row[idx] || '').trim(); });
                return obj as unknown as ImportRow;
            });

            const { valid, errors } = validateImportRows(parsed);
            setValidRows(valid);
            setValidationErrors(errors);
            setPreviewReady(true);
        } catch (err: unknown) {
            alert('Error reading file: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }

        // Reset input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const handleImport = useCallback(() => {
        if (!validRows.length) return;
        onImport(validRows, currentUserName);
    }, [validRows, onImport, currentUserName]);

    return (
        <div>
            <div className="card" style={{ maxWidth: '800px' }}>
                <h2 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>📥 Import Calls</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Import multiple calls at once from an Excel file — useful for adding calls when the WC is away from office
                </p>

                {/* Template download */}
                <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '14px', marginBottom: '16px', fontSize: '13px' }}>
                    <strong>Download the template first:</strong>
                    <button className="btn btn-primary btn-sm" style={{ marginLeft: '10px' }} onClick={downloadTemplate}>
                        📄 Download Template
                    </button>
                    <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        Row 1 = headers, Row 2 = field descriptions, Row 3 = required/optional notes. Row 4 is a sample row (delete it). Enter data from Row 5 onwards.
                    </div>
                </div>

                {/* File drop zone */}
                {!importRunning && !importResult && (
                    <div
                        style={{ border: '2px dashed var(--border)', borderRadius: '10px', padding: '24px', textAlign: 'center', marginBottom: '16px', cursor: 'pointer' }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Select Excel or CSV File</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>.xlsx, .xls, or .csv — max 200 rows</div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            style={{ display: 'none' }}
                            onChange={handleFile}
                        />
                    </div>
                )}

                {/* Import running */}
                {importRunning && (
                    <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>⏳ Importing... {importProgress} / {importTotal}</div>
                        <div style={{ background: 'var(--bg)', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${importTotal > 0 ? (importProgress / importTotal) * 100 : 0}%`, background: 'var(--primary)', height: '100%', transition: 'width 0.2s ease', borderRadius: '6px' }} />
                        </div>
                    </div>
                )}

                {/* Import result */}
                {importResult && !importRunning && (
                    <div style={{ background: importResult.fail === 0 ? '#f0fdf4' : '#fff7ed', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: importResult.fail === 0 ? '#0e9f6e' : '#d97706' }}>
                            {importResult.fail === 0 ? '✅' : '⚠️'} Import Complete!
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '14px' }}>
                            <strong style={{ color: '#0e9f6e' }}>{importResult.success} calls successfully imported</strong>
                            {importResult.fail > 0 && <><br /><strong style={{ color: '#dc2626' }}>{importResult.fail} failed</strong></>}
                        </div>
                        {importResult.errors.length > 0 && (
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>
                                {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                            </div>
                        )}
                        <button className="btn btn-outline btn-sm" style={{ marginTop: '12px' }} onClick={() => { setPreviewReady(false); setValidRows([]); setValidationErrors([]); }}>
                            Import Another File
                        </button>
                    </div>
                )}

                {/* Validation errors */}
                {previewReady && validationErrors.length > 0 && (
                    <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                        <strong style={{ color: '#dc2626' }}>⚠️ {validationErrors.length} rows have errors and will not be imported:</strong>
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#dc2626' }}>
                            {validationErrors.map((e) => (
                                <div key={e.row}>Row {e.row}: {e.errors.join(', ')}</div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Preview */}
                {previewReady && validRows.length > 0 && !importResult && !importRunning && (
                    <>
                        <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px' }}>
                                <strong style={{ color: '#0e9f6e' }}>{validRows.length} valid rows</strong> — ready to import
                            </span>
                            <button className="btn btn-success" onClick={handleImport}>
                                ✅ Import {validRows.length} Calls
                            </button>
                        </div>

                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Model</th>
                                        <th>Call Type</th>
                                        <th>Service</th>
                                        <th>Status</th>
                                        <th>City</th>
                                        <th>Engineer</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {validRows.slice(0, 10).map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.cname || '-'}</td>
                                            <td>{r.model || '-'}</td>
                                            <td>{r.call_type || '-'}</td>
                                            <td>{r.service_type || '-'}</td>
                                            <td><span className="badge badge-pending">{r.status || '-'}</span></td>
                                            <td>{r.city || '-'}</td>
                                            <td>{r.assigned_name || 'Unassigned'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {validRows.length > 10 && (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px' }}>
                                ...and {validRows.length - 10} more rows
                            </div>
                        )}
                    </>
                )}

                {previewReady && validRows.length === 0 && validationErrors.length > 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No valid rows to import after validation.</p>
                )}
            </div>
        </div>
    );
}