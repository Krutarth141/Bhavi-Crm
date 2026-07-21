'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { AutoSiteItem, SiteItemForm, emptySiteItemForm, SERVICE_CHARGE_TYPES } from '@/types/autoSites';
import { AutoInventoryItem } from '@/types/autoInventory';
import { fetchAutoInventory } from '@/services/autoInventoryService';

interface Props {
    siteItems: AutoSiteItem[];
    editItem: AutoSiteItem | null;
    onClose: () => void;
    onSave: (form: SiteItemForm) => Promise<{ success: boolean; error?: string }>;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

const itemToForm = (it: AutoSiteItem): SiteItemForm => ({
    item_name: it.item_name || '', qty: String(it.qty || 1), unit: it.unit || '',
    purchase_price: String(it.purchase_price || 0), unit_price: String(it.unit_price || 0),
    gst_percent: String(it.gst_percent || 0), note: it.note || '',
});

export default function SiteItemFormModal({ siteItems, editItem, onClose, onSave }: Props) {
    const isEdit = !!editItem;
    const [itemType, setItemType] = useState<'product' | 'service'>('product');
    const [form, setForm] = useState<SiteItemForm>(editItem ? itemToForm(editItem) : emptySiteItemForm);
    const [saving, setSaving] = useState(false);

    const [invItems, setInvItems] = useState<AutoInventoryItem[]>([]);
    const [search, setSearch] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedName, setSelectedName] = useState<string | null>(null);

    const [chargeType, setChargeType] = useState(SERVICE_CHARGE_TYPES[0]);
    const [chargeDesc, setChargeDesc] = useState('');
    const [pctOn, setPctOn] = useState(false);
    const [pctBase, setPctBase] = useState<'basic' | 'total'>('basic');
    const [pctValue, setPctValue] = useState('15');

    useEffect(() => {
        if (!isEdit) fetchAutoInventory().then(setInvItems);
    }, [isEdit]);

    const set = (patch: Partial<SiteItemForm>) => setForm(f => ({ ...f, ...patch }));

    const filteredInv = useMemo(() => {
        const q = search.toLowerCase().trim();
        const list = q ? invItems.filter(i => (i.item_name || '').toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q) || (i.model_no || '').toLowerCase().includes(q)) : invItems;
        return list.slice(0, 50);
    }, [invItems, search]);

    const pickInvItem = (it: AutoInventoryItem) => {
        setSelectedName(it.item_name);
        setSearch(it.item_name + (it.brand ? ` (${it.brand})` : ''));
        setDropdownOpen(false);
        const ppAfterGst = Math.round((it.purchase_price || 0) * (1 + (it.gst_percent || 0) / 100));
        set({ item_name: it.item_name, purchase_price: String(ppAfterGst), unit_price: String(it.selling_price || 0), gst_percent: String(it.gst_percent || 0), unit: it.unit || 'pcs' });
    };

    const pickCustom = () => {
        setSelectedName('__custom__');
        setSearch('');
        setDropdownOpen(false);
        set({ item_name: '', purchase_price: '0', unit_price: '0', gst_percent: '0' });
    };

    const basicTotal = useMemo(() => siteItems.reduce((s, i) => s + (i.unit_price || 0) * (i.qty || 0), 0), [siteItems]);
    const grandTotal = useMemo(() => siteItems.reduce((s, i) => s + Math.round((i.unit_price || 0) * (i.qty || 0) * (1 + (i.gst_percent || 0) / 100)), 0), [siteItems]);
    const pctBaseAmount = pctBase === 'total' ? grandTotal : basicTotal;
    const pctAmount = Math.round(pctBaseAmount * (Number(pctValue) || 0) / 100);

    const applyPctAmount = () => {
        if (!pctAmount) { alert('Please enter a percentage value first.'); return; }
        set({ unit_price: String(pctAmount), qty: '1', unit: 'job' });
        setPctOn(false);
    };

    const total = Math.round((Number(form.unit_price) || 0) * (Number(form.qty) || 1) * (1 + (Number(form.gst_percent) || 0) / 100));

    const handleSave = async () => {
        let finalName = form.item_name.trim();
        if (!isEdit && itemType === 'service') {
            finalName = chargeType + (chargeDesc.trim() ? ` — ${chargeDesc.trim()}` : '');
        }
        if (!finalName) { alert('Item name is required!'); return; }
        setSaving(true);
        const r = await onSave({ ...form, item_name: finalName });
        setSaving(false);
        if (r.success) onClose();
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : (isEdit ? '💾 Update' : '💾 Save')}</button>
        </div>
    );

    return (
        <Modal isOpen title={isEdit ? '✏️ Edit Item' : '➕ Add BOQ Item'} onClose={onClose} footer={footer}>
            {!isEdit && (
                <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
                    <button onClick={() => setItemType('product')} style={{ flex: 1, padding: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: itemType === 'product' ? '#eff6ff' : '#f3f4f6', color: itemType === 'product' ? '#1d4ed8' : '#6b7280' }}>📦 Product</button>
                    <button onClick={() => setItemType('service')} style={{ flex: 1, padding: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: itemType === 'service' ? '#fef3c7' : '#f3f4f6', color: itemType === 'service' ? '#92400e' : '#6b7280', borderLeft: '1px solid #e5e7eb' }}>🔧 Service Charge</button>
                </div>
            )}

            {isEdit && (
                <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Item Name *</label>
                    <input value={form.item_name} onChange={e => set({ item_name: e.target.value })} style={fieldStyle} />
                </div>
            )}

            {!isEdit && itemType === 'product' && (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                    <label style={labelStyle}>Search Item</label>
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setDropdownOpen(true); if (selectedName) { setSelectedName(null); set({ item_name: '' }); } }}
                        onFocus={() => setDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                        placeholder="Type item name..."
                        style={fieldStyle}
                    />
                    {dropdownOpen && (
                        <div style={{ position: 'absolute', zIndex: 30, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, maxHeight: 220, overflowY: 'auto', width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', top: '100%', left: 0 }}>
                            {filteredInv.map(it => (
                                <div key={it.id} onMouseDown={e => { e.preventDefault(); pickInvItem(it); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f0f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div><b>{it.item_name}</b>{it.brand ? <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 4 }}>{it.brand}</span> : null}</div>
                                        <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af' }}>{it.selling_price ? <span style={{ color: '#059669', fontWeight: 700 }}>Sell ₹{Number(it.selling_price).toLocaleString('en-IN')}</span> : null}</div>
                                    </div>
                                </div>
                            ))}
                            {filteredInv.length === 0 && <div style={{ padding: 12, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>No items found — use Custom</div>}
                            <div onMouseDown={e => { e.preventDefault(); pickCustom(); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#7c3aed', borderTop: '1px solid #e5e7eb' }}>✏️ Custom Item...</div>
                        </div>
                    )}
                    {selectedName === '__custom__' && (
                        <div style={{ marginTop: 10 }}>
                            <label style={labelStyle}>Custom Item Name *</label>
                            <input value={form.item_name} onChange={e => set({ item_name: e.target.value })} placeholder="Enter item name..." style={fieldStyle} />
                        </div>
                    )}
                </div>
            )}

            {!isEdit && itemType === 'service' && (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                            <label style={labelStyle}>Charge Type *</label>
                            <select value={chargeType} onChange={e => setChargeType(e.target.value)} style={fieldStyle}>
                                {SERVICE_CHARGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Description (optional)</label>
                            <input value={chargeDesc} onChange={e => setChargeDesc(e.target.value)} placeholder="e.g. Per camera installation" style={fieldStyle} />
                        </div>
                    </div>
                    <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                            <input type="checkbox" checked={pctOn} onChange={e => setPctOn(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                            📊 % of Invoice Total (Auto Calculate)
                        </label>
                        {pctOn && (
                            <div style={{ marginTop: 10 }}>
                                <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#92400e', cursor: 'pointer' }}>
                                        <input type="radio" checked={pctBase === 'basic'} onChange={() => setPctBase('basic')} /> % on Basic Price <span style={{ fontWeight: 400, color: '#6b7280' }}>(excl. GST)</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#92400e', cursor: 'pointer' }}>
                                        <input type="radio" checked={pctBase === 'total'} onChange={() => setPctBase('total')} /> % on Total Price <span style={{ fontWeight: 400, color: '#6b7280' }}>(incl. GST)</span>
                                    </label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 120 }}>
                                        <label style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Percentage %</label>
                                        <input type="number" min={0} max={100} step={0.5} value={pctValue} onChange={e => setPctValue(e.target.value)} style={{ ...fieldStyle, background: '#fffbeb', border: '1px solid #fcd34d', fontWeight: 700 }} />
                                    </div>
                                    <div style={{ flex: 2, minWidth: 160 }}>
                                        <label style={{ fontSize: 11, color: '#6b7280' }}>{pctBase === 'total' ? 'Invoice Grand Total (incl. GST)' : 'Invoice Basic Total (excl. GST)'}</label>
                                        <input readOnly value={`₹${pctBaseAmount.toLocaleString('en-IN')}`} style={{ ...fieldStyle, background: '#f0f9ff' }} />
                                    </div>
                                    <div style={{ flex: 2, minWidth: 160 }}>
                                        <label style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>Calculated Amount ₹</label>
                                        <input readOnly value={`₹${pctAmount.toLocaleString('en-IN')} (${pctValue}% of ₹${pctBaseAmount.toLocaleString('en-IN')})`} style={{ ...fieldStyle, border: '2px solid #059669', background: '#f0fff4', color: '#065f46', fontWeight: 800 }} />
                                    </div>
                                </div>
                                <button onClick={applyPctAmount} style={{ marginTop: 8, width: '100%', padding: '7px 0', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✅ Apply This Amount to Selling Price</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Qty</label><input type="number" min={0.5} step={0.5} value={form.qty} onChange={e => set({ qty: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Unit</label>
                    <select value={form.unit} onChange={e => set({ unit: e.target.value })} style={fieldStyle}>
                        {['pcs', 'set', 'Pair', 'mtr', 'rft', 'job', 'yr'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
                <div><label style={labelStyle}>GST %</label>
                    <select value={form.gst_percent} onChange={e => set({ gst_percent: e.target.value })} style={fieldStyle}>
                        <option value="0">No GST</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option>
                    </select>
                </div>
                <div><label style={labelStyle}>Purchase ₹</label><input type="number" min={0} value={form.purchase_price} onChange={e => set({ purchase_price: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Selling ₹</label><input type="number" min={0} value={form.unit_price} onChange={e => set({ unit_price: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Total ₹</label><input readOnly value={total} style={{ ...fieldStyle, background: '#f0f9ff', fontWeight: 700 }} /></div>
            </div>
            <div><label style={labelStyle}>Note</label><input value={form.note} onChange={e => set({ note: e.target.value })} placeholder="Optional..." style={fieldStyle} /></div>
        </Modal>
    );
}