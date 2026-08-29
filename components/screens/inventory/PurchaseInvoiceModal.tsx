'use client';

import { useMemo, useState } from 'react';
import { InventoryItem } from '@/types/inventory';
import { checkInvoiceDuplicate, savePurchaseInvoice } from '@/services/inventoryPurchaseService';

interface Row {
    code: string;
    name: string;
    qty: string;
    dtp: string;
    gst: string;
    mrp: string;
}

const emptyRow = (): Row => ({ code: '', name: '', qty: '', dtp: '', gst: '18', mrp: '' });

interface Props {
    inventory: InventoryItem[];
    addedBy: string;
    onClose: () => void;
    onSaved: () => void;
}

const inputStyle = { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 12, outline: 'none', boxSizing: 'border-box' as const };

export default function PurchaseInvoiceModal({ inventory, addedBy, onClose, onSaved }: Props) {
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [supplier, setSupplier] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [note, setNote] = useState('');
    const [rows, setRows] = useState<Row[]>(Array.from({ length: 5 }, emptyRow));
    const [dupWarning, setDupWarning] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const patchRow = (idx: number, patch: Partial<Row>) => setRows(rs => rs.map((r, i) => i === idx ? { ...r, ...patch } : r));
    const addRow = () => setRows(rs => [...rs, emptyRow()]);
    const removeRow = (idx: number) => setRows(rs => rs.filter((_, i) => i !== idx));

    const handleCodeInput = (idx: number, code: string) => {
        const upper = code.trim().toUpperCase();
        const inv = inventory.find(i => (i.part_code || '').toUpperCase() === upper);
        if (inv) {
            patchRow(idx, {
                code, name: inv.item_name || '',
                dtp: String(inv.purchase_price || inv.unit_price || 0),
                gst: String(inv.gst_pct != null ? inv.gst_pct : 18),
                mrp: String(inv.unit_price || 0),
            });
        } else {
            patchRow(idx, { code });
        }
    };

    const handleInvoiceBlur = async () => {
        if (!invoiceNo.trim()) { setDupWarning(null); return; }
        const existing = await checkInvoiceDuplicate(invoiceNo);
        setDupWarning(existing ? `⚠️ Invoice ${invoiceNo} already exists! (${existing.supplier || ''} | ${existing.purchase_date || ''}) — Are you sure you want to add more items to this invoice?` : null);
    };

    const rowTotal = (r: Row) => {
        const qty = Number(r.qty) || 0, dtp = Number(r.dtp) || 0;
        return r.code.trim() && qty ? qty * dtp : 0;
    };

    const filledRows = useMemo(() => rows.filter(r => r.code.trim() && Number(r.qty) > 0), [rows]);
    const grandTotal = useMemo(() => filledRows.reduce((s, r) => s + rowTotal(r), 0), [filledRows]);

    const handleSave = async () => {
        if (!date || !supplier.trim() || !invoiceNo.trim()) { alert('Please fill Supplier, Invoice No and Date.'); return; }
        if (!filledRows.length) { alert('Please enter at least one part with a part code and quantity.'); return; }

        setSaving(true);
        const r = await savePurchaseInvoice({
            date, supplier: supplier.trim(), invoiceNo: invoiceNo.trim(), note: note.trim(),
            rows: filledRows.map(r => ({
                code: r.code.trim().toUpperCase(), name: r.name.trim(),
                qty: Number(r.qty) || 0, dtp: Number(r.dtp) || 0,
                gst: r.gst === '' ? 18 : Number(r.gst), mrp: Number(r.mrp) || 0,
            })),
            inventory, addedBy,
        });
        setSaving(false);
        if (r.success) {
            alert(`✅ Invoice saved! ${r.savedCount} item(s) added to stock. Prices updated.`);
            onSaved();
            onClose();
        } else alert('Error saving: ' + r.error);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }} onClick={onClose}>
            <datalist id="pur-parts-dl">
                {inventory.map(i => i.part_code ? <option key={i.id} value={i.part_code} /> : null)}
            </datalist>
            <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 860, maxHeight: '96vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px 14px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>🛒 Purchase Invoice Entry</div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                </div>
                <div style={{ padding: '18px 22px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 5 }}>SUPPLIER / DEALER *</label>
                            <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 5 }}>INVOICE NO *</label>
                            <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} onBlur={handleInvoiceBlur} placeholder="e.g. INV-2026-001" style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 5 }}>DATE *</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                    {dupWarning && <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 12 }}>{dupWarning}</div>}

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    {['Part Code', 'Description', 'QTY', 'DTP ₹', 'GST%', 'MRP ₹', 'Net Total', ''].map(h => (
                                        <th key={h} style={{ padding: '8px 10px', textAlign: h === 'QTY' || h === 'GST%' ? 'center' : h === 'DTP ₹' || h === 'MRP ₹' || h === 'Net Total' ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={i}>
                                        <td style={{ padding: '5px 6px' }}><input list="pur-parts-dl" value={r.code} onChange={e => handleCodeInput(i, e.target.value)} placeholder="Part code" style={inputStyle} /></td>
                                        <td style={{ padding: '5px 6px' }}><input value={r.name} onChange={e => patchRow(i, { name: e.target.value })} placeholder="Description" style={inputStyle} /></td>
                                        <td style={{ padding: '5px 6px' }}><input type="number" min={1} value={r.qty} onChange={e => patchRow(i, { qty: e.target.value })} placeholder="0" style={{ ...inputStyle, textAlign: 'center' }} /></td>
                                        <td style={{ padding: '5px 6px' }}><input type="number" min={0} value={r.dtp} onChange={e => patchRow(i, { dtp: e.target.value })} placeholder="0" style={{ ...inputStyle, textAlign: 'right' }} /></td>
                                        <td style={{ padding: '5px 6px' }}><input type="number" min={0} max={100} value={r.gst} onChange={e => patchRow(i, { gst: e.target.value })} placeholder="18" style={{ ...inputStyle, textAlign: 'center' }} /></td>
                                        <td style={{ padding: '5px 6px' }}><input type="number" min={0} value={r.mrp} onChange={e => patchRow(i, { mrp: e.target.value })} placeholder="0" style={{ ...inputStyle, textAlign: 'right' }} /></td>
                                        <td style={{ padding: '5px 6px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>{rowTotal(r) ? `₹${rowTotal(r).toFixed(0)}` : '—'}</td>
                                        <td style={{ padding: '5px 3px', textAlign: 'center' }}><button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, lineHeight: 1 }} title="Remove row">×</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={addRow} style={{ marginTop: 10, padding: '7px 14px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#1d4ed8', fontWeight: 600 }}>+ Add Row</button>

                    <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Items: <b>{filledRows.length}</b></div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Grand Total: <span style={{ color: '#1d4ed8' }}>₹{grandTotal.toFixed(0)}</span></div>
                    </div>
                    <div style={{ marginTop: 4 }}><input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid #e2e8f0', background: '#fff', position: 'sticky', bottom: 0 }}>
                    <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff' }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{ padding: '9px 22px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : '💾 Save Invoice'}</button>
                </div>
            </div>
        </div>
    );
}