'use client';

import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { AutoSiteItem, VisitMaterialItem, VisitDeliveryDetails } from '@/types/autoSites';

interface MaterialRow {
    site_item_id: number | null;
    item_name: string;
    purchase_price: number;
    sell_price: number;
    gst_percent: number;
    discount_pct: string;
    qty: string;
}

interface Props {
    siteName: string;
    pendingSiteItems: AutoSiteItem[];
    onClose: () => void;
    onSave: (data: {
        visit_date: string;
        visit_time: string;
        work_done: string;
        materials: VisitMaterialItem[];
        deliveryDetails: VisitDeliveryDetails | null;
        photos: string[];
    }) => Promise<{ success: boolean; error?: string }>;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

const emptyRow = (): MaterialRow => ({ site_item_id: null, item_name: '', purchase_price: 0, sell_price: 0, gst_percent: 0, discount_pct: '0', qty: '1' });

const readFileAsBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

export default function AddVisitModal({ siteName, pendingSiteItems, onClose, onSave }: Props) {
    const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
    const [visitTime, setVisitTime] = useState('');
    const [workDone, setWorkDone] = useState('');
    const [rows, setRows] = useState<MaterialRow[]>([]);
    const [deliveryMode, setDeliveryMode] = useState('');
    const [docket, setDocket] = useState('');
    const [courierDate, setCourierDate] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [porterDate, setPorterDate] = useState('');
    const [contactMobile, setContactMobile] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const addRow = () => setRows(rs => [...rs, emptyRow()]);
    const removeRow = (idx: number) => setRows(rs => rs.filter((_, i) => i !== idx));
    const patchRow = (idx: number, patch: Partial<MaterialRow>) => setRows(rs => rs.map((r, i) => i === idx ? { ...r, ...patch } : r));

    const pickItem = (idx: number, siteItemId: number) => {
        const it = pendingSiteItems.find(i => i.id === siteItemId);
        if (!it) { patchRow(idx, { site_item_id: null, item_name: '', purchase_price: 0, sell_price: 0, gst_percent: 0, discount_pct: '0' }); return; }
        patchRow(idx, {
            site_item_id: it.id, item_name: it.item_name,
            purchase_price: it.purchase_price || 0, sell_price: it.unit_price || 0,
            gst_percent: it.gst_percent || 0, discount_pct: '0',
        });
    };

    const rowFinalPerUnit = (r: MaterialRow) => {
        const disc = Number(r.discount_pct) || 0;
        const discountedSp = r.sell_price * (1 - disc / 100);
        return discountedSp * (1 + r.gst_percent / 100);
    };

    const rowTotal = (r: MaterialRow) => Math.round(rowFinalPerUnit(r) * (Number(r.qty) || 0));

    const grandTotal = useMemo(() => rows.reduce((s, r) => s + rowTotal(r), 0), [rows]);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).slice(0, 4 - photos.length);
        const encoded = await Promise.all(files.map(readFileAsBase64));
        setPhotos(p => [...p, ...encoded].slice(0, 4));
        e.target.value = '';
    };

    const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx));

    const handleSave = async () => {
        if (!visitDate) { alert('Date required!'); return; }

        const materials: VisitMaterialItem[] = rows
            .filter(r => r.site_item_id)
            .map(r => {
                const disc = Number(r.discount_pct) || 0;
                const qty = Number(r.qty) || 1;
                const discountedSp = r.sell_price * (1 - disc / 100);
                return {
                    site_item_id: r.site_item_id!, item_name: r.item_name,
                    purchase_price: r.purchase_price, selling_price: discountedSp,
                    discount_pct: disc, gst_percent: r.gst_percent, qty,
                    total: rowTotal(r),
                };
            });

        let deliveryDetails: VisitDeliveryDetails | null = null;
        if (deliveryMode) {
            deliveryDetails = { mode: deliveryMode };
            if (deliveryMode === 'Courier') { deliveryDetails.docket = docket; deliveryDetails.courier_date = courierDate; }
            else if (deliveryMode === 'Porter') { deliveryDetails.contact_person = contactPerson; deliveryDetails.porter_date = porterDate; }
            else if (deliveryMode === 'By Hand') { deliveryDetails.contact_person = contactPerson; deliveryDetails.contact_mobile = contactMobile; }
        }

        setSaving(true);
        const r = await onSave({ visit_date: visitDate, visit_time: visitTime, work_done: workDone.trim(), materials, deliveryDetails, photos });
        setSaving(false);
        if (r.success) onClose();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save Visit'}</button>
        </div>
    );

    return (
        <Modal isOpen title={`➕ Visit — ${siteName}`} onClose={onClose} footer={footer} size="lg">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Visit Date *</label><input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Time</label><input type="time" value={visitTime} onChange={e => setVisitTime(e.target.value)} style={fieldStyle} /></div>
            </div>
            <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Work Done 🔧</label>
                <textarea value={workDone} onChange={e => setWorkDone(e.target.value)} rows={3} placeholder="Describe the work done..." style={{ ...fieldStyle, resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>📷 Photos <span style={{ fontWeight: 400, color: '#6b7280' }}>(optional, max 4)</span></label>
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} disabled={photos.length >= 4} style={fieldStyle} />
                {photos.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {photos.map((p, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                                <img src={p} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                                <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: -6, right: -6, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', lineHeight: '18px', padding: 0 }}>✕</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '4px 0 12px' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📦 Material Delivered</h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Site items — Purchase &amp; Selling price auto-filled, just enter Qty</p>

            {pendingSiteItems.length === 0 ? (
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#92400e', marginBottom: 10 }}>No items found for this site. Please add items to the site first.</div>
            ) : (
                <>
                    {rows.map((r, i) => (
                        <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                                <div>
                                    <label style={{ fontSize: 11 }}>Item (Site thi)</label>
                                    <select value={r.site_item_id ?? ''} onChange={e => pickItem(i, Number(e.target.value))} style={fieldStyle}>
                                        <option value="">-- Select Item --</option>
                                        {pendingSiteItems.map(it => (
                                            <option key={it.id} value={it.id}>{it.item_name} — Sell ₹{it.unit_price || 0}{it.gst_percent ? ` +${it.gst_percent}%GST` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div><label style={{ fontSize: 11 }}>Sell ₹/unit</label><input readOnly value={r.sell_price} style={{ ...fieldStyle, background: '#f0fff4', fontWeight: 600 }} /></div>
                                <div><label style={{ fontSize: 11 }}>Discount %</label><input type="number" min={0} max={100} step={0.5} value={r.discount_pct} onChange={e => patchRow(i, { discount_pct: e.target.value })} style={fieldStyle} /></div>
                                <div><label style={{ fontSize: 11 }}>Final ₹/unit <span style={{ fontSize: 10 }}>(+GST)</span></label><input readOnly value={r.site_item_id ? rowFinalPerUnit(r).toFixed(2) : ''} style={{ ...fieldStyle, background: '#fff3cd', border: '1px solid #ffc107', fontWeight: 700 }} /></div>
                                <div><label style={{ fontSize: 11 }}>Qty *</label><input type="number" min={0.1} step={0.1} value={r.qty} onChange={e => patchRow(i, { qty: e.target.value })} style={fieldStyle} /></div>
                                <button onClick={() => removeRow(i)} style={{ background: '#fee2e2', border: 'none', color: '#dc2626', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', height: 36 }}>✕</button>
                            </div>
                            {r.site_item_id && r.qty && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12 }}>
                                    <span style={{ color: '#d97706', fontWeight: 700 }}>Total (with GST): ₹{rowTotal(r).toLocaleString('en-IN')}</span>
                                    <span style={{ color: '#6b7280' }}>Purchase: ₹{Math.round(r.purchase_price * (Number(r.qty) || 0)).toLocaleString('en-IN')} | Margin: ₹{Math.round((r.sell_price * (1 - (Number(r.discount_pct) || 0) / 100) - r.purchase_price) * (Number(r.qty) || 0)).toLocaleString('en-IN')}</span>
                                </div>
                            )}
                        </div>
                    ))}
                    <button onClick={addRow} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 12, marginTop: 2 }}>+ Add Material</button>
                    {rows.length > 0 && (
                        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 13, fontWeight: 700, color: '#059669' }}>Grand Total: ₹{grandTotal.toLocaleString('en-IN')}</div>
                    )}
                </>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '14px 0 12px' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🚚 Delivery Method</h3>
            <div style={{ maxWidth: 260, marginBottom: 8 }}>
                <label style={labelStyle}>Delivery Mode</label>
                <select value={deliveryMode} onChange={e => setDeliveryMode(e.target.value)} style={fieldStyle}>
                    <option value="">-- Select Mode --</option>
                    <option value="Courier">📦 Courier</option>
                    <option value="Porter">🛵 Porter</option>
                    <option value="By Hand">🤝 By Hand</option>
                </select>
            </div>
            {deliveryMode === 'Courier' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={labelStyle}>Docket / Tracking No</label><input value={docket} onChange={e => setDocket(e.target.value)} placeholder="Enter docket no." style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Courier Date</label><input type="date" value={courierDate} onChange={e => setCourierDate(e.target.value)} style={fieldStyle} /></div>
                </div>
            )}
            {deliveryMode === 'Porter' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={labelStyle}>Contact Person Name</label><input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Porter contact name" style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Date</label><input type="date" value={porterDate} onChange={e => setPorterDate(e.target.value)} style={fieldStyle} /></div>
                </div>
            )}
            {deliveryMode === 'By Hand' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={labelStyle}>Contact Person</label><input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Name of person" style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Mobile No</label><input type="tel" value={contactMobile} onChange={e => setContactMobile(e.target.value)} placeholder="Mobile number" style={fieldStyle} /></div>
                </div>
            )}
        </Modal>
    );
}