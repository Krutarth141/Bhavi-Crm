'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { AutoInventoryItem, AutoInventoryForm, emptyAutoInventoryForm, AUTO_UNITS } from '@/types/autoInventory';

interface Props {
    editItem: AutoInventoryItem | null;   // null = add mode
    allItems: AutoInventoryItem[];        // for datalists + model-no autofill
    onClose: () => void;
    onSave: (form: AutoInventoryForm) => Promise<{ success: boolean; error?: string }>;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

const itemToForm = (it: AutoInventoryItem): AutoInventoryForm => ({
    ...emptyAutoInventoryForm(),
    brand: it.brand || '', made_in: it.made_in || '', item_name: it.item_name || '',
    category: it.category || '', purchase_price: String(it.purchase_price || 0),
    stock_qty: String(it.stock_qty || 0), unit: it.unit || 'pcs',
    gst_percent: String(it.gst_percent || 0), selling_price: String(it.selling_price || 0),
    model_no: it.model_no || '', description: it.description || '',
});

export default function AutoInventoryFormModal({ editItem, allItems, onClose, onSave }: Props) {
    const isEdit = !!editItem;
    const [form, setForm] = useState<AutoInventoryForm>(editItem ? itemToForm(editItem) : emptyAutoInventoryForm());
    const [saving, setSaving] = useState(false);

    const set = (patch: Partial<AutoInventoryForm>) => setForm(f => ({ ...f, ...patch }));

    const brands = [...new Set(allItems.map(i => i.brand).filter(Boolean))] as string[];
    const madeIns = [...new Set(['China', 'India', 'Taiwan', 'Japan', 'South Korea', 'USA', ...allItems.map(i => i.made_in).filter(Boolean)])] as string[];
    const models = [...new Set(allItems.map(i => i.model_no).filter(Boolean))] as string[];

    // Same model no → auto-fill all fields from the matching item (matches HTML).
    const onModelChange = (value: string) => {
        set({ model_no: value });
        const match = allItems.find(i => (i.model_no || '').toLowerCase() === value.trim().toLowerCase());
        if (!match) return;
        set({
            model_no: value,
            brand: match.brand || '', made_in: match.made_in || '',
            item_name: match.item_name || '', category: match.category || '',
            description: match.description || '', unit: match.unit || 'pcs',
            purchase_price: String(match.purchase_price || 0),
            selling_price: String(match.selling_price || 0),
            gst_percent: String(match.gst_percent || 0),
        });
    };

    const gst = Number(form.gst_percent) || 0;
    const finalPurchase = ((Number(form.purchase_price) || 0) * (1 + gst / 100)).toFixed(2);
    const finalSell = ((Number(form.selling_price) || 0) * (1 + gst / 100)).toFixed(2);

    const handleSave = async () => {
        if (!form.item_name.trim()) { alert('Item name required!'); return; }
        setSaving(true);
        const r = await onSave(form);
        setSaving(false);
        if (r.success) onClose();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save'}</button>
        </div>
    );

    return (
        <Modal isOpen title={isEdit ? '✏️ Edit Item' : '➕ Add Inventory Item'} onClose={onClose} footer={footer}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                        <label style={labelStyle}>Brand</label>
                        <input list="ainv-brands" value={form.brand} onChange={e => set({ brand: e.target.value })} placeholder="e.g. Hikvision, CP Plus" style={fieldStyle} />
                        <datalist id="ainv-brands">{brands.map(b => <option key={b} value={b} />)}</datalist>
                    </div>
                    <div>
                        <label style={labelStyle}>Made In (Country)</label>
                        <input list="ainv-madeins" value={form.made_in} onChange={e => set({ made_in: e.target.value })} placeholder="e.g. China, India, Taiwan" style={fieldStyle} />
                        <datalist id="ainv-madeins">{madeIns.map(m => <option key={m} value={m} />)}</datalist>
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Model No <span style={{ fontWeight: 400, color: '#6b7280' }}>(same model no auto-fills the item)</span></label>
                    <input list="ainv-models" value={form.model_no} onChange={e => onModelChange(e.target.value)} placeholder="e.g. DS-2CD2143G2-I" style={fieldStyle} />
                    <datalist id="ainv-models">{models.map(m => <option key={m} value={m} />)}</datalist>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                        <label style={labelStyle}>Item Name *</label>
                        <input value={form.item_name} onChange={e => set({ item_name: e.target.value })} placeholder="e.g. 2MP Dome Camera" style={fieldStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Category</label>
                        <input value={form.category} onChange={e => set({ category: e.target.value })} placeholder="e.g. Camera, Cable, Switch" style={fieldStyle} />
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Description</label>
                    <input value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Product detail, specification..." style={fieldStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                        <label style={labelStyle}>Unit</label>
                        <select value={form.unit} onChange={e => set({ unit: e.target.value })} style={fieldStyle}>
                            {AUTO_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    {!isEdit && (
                        <div>
                            <label style={labelStyle}>Opening Stock</label>
                            <input type="number" min={0} value={form.stock_qty} onChange={e => set({ stock_qty: e.target.value })} style={fieldStyle} />
                        </div>
                    )}
                </div>
                {!isEdit && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={labelStyle}>Dealer / Supplier</label>
                            <input value={form.dealer} onChange={e => set({ dealer: e.target.value })} placeholder="e.g. Rashmi Traders" style={fieldStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Purchase Date</label>
                            <input type="date" value={form.purchase_date} onChange={e => set({ purchase_date: e.target.value })} style={fieldStyle} />
                        </div>
                    </div>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0 }}>💰 Pricing</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                        <label style={labelStyle}>Purchase ₹ (Basic, excl. GST)</label>
                        <input type="number" min={0} value={form.purchase_price} onChange={e => set({ purchase_price: e.target.value })} style={fieldStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>GST %</label>
                        <select value={form.gst_percent} onChange={e => set({ gst_percent: e.target.value })} style={fieldStyle}>
                            <option value="0">No GST (0%)</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Final Purchase (with GST) ₹</label>
                        <input readOnly value={finalPurchase} style={{ ...fieldStyle, background: '#fff3cd', border: '1px solid #ffc107', fontWeight: 700 }} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                        <label style={labelStyle}>Sell Price ₹ (Basic, excl. GST)</label>
                        <input type="number" min={0} value={form.selling_price} onChange={e => set({ selling_price: e.target.value })} style={fieldStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Final Sell (with GST) ₹ <span style={{ color: '#059669', fontWeight: 400 }}>Auto</span></label>
                        <input readOnly value={finalSell} style={{ ...fieldStyle, background: '#f0fff4', border: '1px solid #059669', fontWeight: 700 }} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}