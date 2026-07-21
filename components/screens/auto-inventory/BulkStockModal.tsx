'use client';

import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { AutoInventoryItem, BulkStockRow, emptyBulkStockRow } from '@/types/autoInventory';

interface Props {
    type: 'in' | 'out';
    items: AutoInventoryItem[];
    doneBy: string;
    onClose: () => void;
    onSave: (params: {
        type: 'in' | 'out';
        date: string;
        dealerOrCustomer: string;
        invoiceNo: string;
        doneBy: string;
        rows: { itemId: number | null; itemName: string; qty: number; unit: string; price: number; sellPrice: number; gstPercent: number; note: string }[];
    }) => Promise<{ successCount: number; errors: string[] }>;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 8px', fontSize: 12, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

export default function BulkStockModal({ type, items, doneBy, onClose, onSave }: Props) {
    const isIn = type === 'in';
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [dealerOrCustomer, setDealerOrCustomer] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [rows, setRows] = useState<BulkStockRow[]>(Array.from({ length: 5 }, emptyBulkStockRow));
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const patchRow = (idx: number, patch: Partial<BulkStockRow>) => {
        setRows(rs => rs.map((r, i) => i === idx ? { ...r, ...patch } : r));
    };

    const addRow = () => setRows(rs => [...rs, emptyBulkStockRow()]);
    const removeRow = (idx: number) => setRows(rs => rs.filter((_, i) => i !== idx));

    const filteredItems = (idx: number) => {
        const q = rows[idx].itemName.toLowerCase().trim();
        const list = q ? items.filter(it => (it.item_name || '').toLowerCase().includes(q) || (it.brand || '').toLowerCase().includes(q)) : items;
        return list.slice(0, 40);
    };

    const pickItem = (idx: number, it: AutoInventoryItem) => {
        patchRow(idx, {
            itemId: it.id,
            itemName: it.item_name + (it.brand ? ` (${it.brand})` : ''),
            unit: it.unit || 'pcs',
            price: String(it.purchase_price || 0),
            sellPrice: (!rows[idx].sellPrice || rows[idx].sellPrice === '0') ? String(it.selling_price || it.purchase_price || 0) : rows[idx].sellPrice,
        });
        setOpenIdx(null);
    };

    const rowTotal = (r: BulkStockRow) => {
        const price = Number(r.price) || 0, qty = Number(r.qty) || 0, gst = Number(r.gstPercent) || 0;
        return Math.round(price * qty * (1 + gst / 100));
    };

    const grandTotal = useMemo(() => rows.reduce((s, r) => s + rowTotal(r), 0), [rows]);

    const handleSave = async () => {
        const validRows = rows
            .filter(r => r.itemName.trim() && Number(r.qty) > 0)
            .map(r => ({
                itemId: r.itemId, itemName: r.itemName.replace(/\s*\([^)]*\)\s*$/, '').trim(),
                qty: Number(r.qty) || 0, unit: r.unit || 'pcs',
                price: Number(r.price) || 0, sellPrice: Number(r.sellPrice) || 0,
                gstPercent: Number(r.gstPercent) || 0, note: r.note.trim(),
            }));
        if (!validRows.length) { alert('No items filled!'); return; }

        if (!isIn) {
            const warnings = validRows.filter(r => r.price > 0 && r.sellPrice > 0 && r.sellPrice < r.price);
            if (warnings.length) {
                const list = warnings.map(r => `${r.itemName}: Purchase ₹${r.price} > Sell ₹${r.sellPrice}`).join('\n');
                if (!confirm(`⚠️ Sell price is lower than Purchase price:\n\n${list}\n\nDo you still want to save?`)) return;
            }
        }

        setSaving(true);
        const r = await onSave({ type, date, dealerOrCustomer: dealerOrCustomer.trim(), invoiceNo: invoiceNo.trim(), doneBy, rows: validRows });
        setSaving(false);
        alert(`✅ ${r.successCount} items stock updated!${r.errors.length ? `\n\nErrors:\n${r.errors.join('\n')}` : ''}`);
        if (r.successCount > 0) onClose();
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save & Update Stock'}</button>
        </div>
    );

    return (
        <Modal isOpen title={isIn ? '⬇️ Bulk Stock IN (Purchase)' : '⬆️ Bulk Stock OUT / Sell'} onClose={onClose} footer={footer} size="lg">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                    <label style={labelStyle}>{isIn ? 'Dealer / Supplier' : 'Customer / Purpose'}</label>
                    <input value={dealerOrCustomer} onChange={e => setDealerOrCustomer(e.target.value)} placeholder={isIn ? 'e.g. Rashmi Traders' : 'e.g. Rajesh Patel / Site Use'} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Invoice No</label>
                    <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder={isIn ? 'e.g. INV-2026-001' : 'optional'} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} />
                </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#1e40af', marginBottom: 10 }}>
                Search for an item and enter quantity. New items will be automatically added to inventory.
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, fontSize: 12 }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: 8, textAlign: 'left', minWidth: 200 }}>Item / Product</th>
                            <th style={{ padding: 8, textAlign: 'center', width: 65 }}>Qty</th>
                            {isIn ? (
                                <>
                                    <th style={{ padding: 8, textAlign: 'center', width: 55 }}>Unit</th>
                                    <th style={{ padding: 8, textAlign: 'right', width: 90 }}>Purchase ₹</th>
                                    <th style={{ padding: 8, textAlign: 'right', width: 90 }}>Sell ₹/Unit</th>
                                    <th style={{ padding: 8, textAlign: 'center', width: 70 }}>GST %</th>
                                    <th style={{ padding: 8, textAlign: 'right', width: 95 }}>Total ₹</th>
                                </>
                            ) : (
                                <>
                                    <th style={{ padding: 8, textAlign: 'right', width: 90 }}>Purchase ₹</th>
                                    <th style={{ padding: 8, textAlign: 'right', width: 90 }}>Sell ₹/Unit</th>
                                </>
                            )}
                            <th style={{ padding: 8, textAlign: 'left' }}>Note</th>
                            <th style={{ padding: 8, width: 32 }} />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => {
                            const warn = !isIn && Number(r.price) > 0 && Number(r.sellPrice) > 0 && Number(r.sellPrice) < Number(r.price);
                            return (
                                <tr key={i}>
                                    <td style={{ padding: 4, position: 'relative' }}>
                                        <input
                                            value={r.itemName}
                                            placeholder="Item search..."
                                            autoComplete="off"
                                            onChange={e => patchRow(i, { itemName: e.target.value, itemId: null })}
                                            onFocus={() => setOpenIdx(i)}
                                            onBlur={() => setTimeout(() => setOpenIdx(o => o === i ? null : o), 200)}
                                            style={fieldStyle}
                                        />
                                        {openIdx === i && (
                                            <div style={{ position: 'absolute', zIndex: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, maxHeight: 200, overflowY: 'auto', width: 240, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', top: '100%', left: 0 }}>
                                                {filteredItems(i).map(it => (
                                                    <div key={it.id} onMouseDown={e => { e.preventDefault(); pickItem(i, it); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f1f5f9' }}>
                                                        {it.item_name}{it.brand ? <span style={{ color: '#7c3aed', fontSize: 10 }}> ({it.brand})</span> : null} <span style={{ color: '#059669', fontSize: 10 }}>Stock:{it.stock_qty || 0}</span>
                                                    </div>
                                                ))}
                                                <div onMouseDown={e => { e.preventDefault(); setOpenIdx(null); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#1d4ed8', fontWeight: 600, borderTop: '2px solid #e5e7eb' }}>➕ New item add kariye</div>
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: 4 }}><input type="number" min={0} value={r.qty} onChange={e => patchRow(i, { qty: e.target.value })} style={{ ...fieldStyle, textAlign: 'center' }} /></td>
                                    {isIn ? (
                                        <>
                                            <td style={{ padding: 4 }}><input value={r.unit} onChange={e => patchRow(i, { unit: e.target.value })} style={fieldStyle} /></td>
                                            <td style={{ padding: 4 }}><input type="number" min={0} value={r.price} onChange={e => patchRow(i, { price: e.target.value })} style={{ ...fieldStyle, textAlign: 'right' }} /></td>
                                            <td style={{ padding: 4 }}><input type="number" min={0} value={r.sellPrice} onChange={e => patchRow(i, { sellPrice: e.target.value })} style={{ ...fieldStyle, textAlign: 'right' }} /></td>
                                            <td style={{ padding: 4 }}>
                                                <select value={r.gstPercent} onChange={e => patchRow(i, { gstPercent: e.target.value })} style={fieldStyle}>
                                                    {['0', '5', '12', '18', '28'].map(g => <option key={g} value={g}>{g}%</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: 4, textAlign: 'right', fontWeight: 700, color: '#065f46' }}>₹{rowTotal(r).toLocaleString('en-IN')}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td style={{ padding: 4 }}><input readOnly value={r.price} style={{ ...fieldStyle, textAlign: 'right', background: '#f8fafc', color: '#6b7280' }} title="Purchase price from inventory" /></td>
                                            <td style={{ padding: 4 }}>
                                                <input type="number" min={0} value={r.sellPrice} onChange={e => patchRow(i, { sellPrice: e.target.value })}
                                                    style={{ ...fieldStyle, textAlign: 'right', ...(warn ? { borderColor: '#f59e0b', background: '#fffbeb' } : {}) }}
                                                    title={warn ? `⚠️ Sell price ₹${r.sellPrice} < Purchase price ₹${r.price}` : ''} />
                                            </td>
                                        </>
                                    )}
                                    <td style={{ padding: 4 }}><input value={r.note} onChange={e => patchRow(i, { note: e.target.value })} placeholder="optional" style={fieldStyle} /></td>
                                    <td style={{ padding: 4 }}><button onClick={() => removeRow(i)} style={{ background: '#fee2e2', border: 'none', color: '#dc2626', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {isIn && (
                        <tfoot>
                            <tr>
                                <td colSpan={6} style={{ padding: 8, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>Grand Total (incl. GST):</td>
                                <td style={{ padding: 8, textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#059669' }}>₹{grandTotal.toLocaleString('en-IN')}</td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            <button onClick={addRow} style={{ marginTop: 8, padding: '6px 14px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>+ Add Row</button>
        </Modal>
    );
}