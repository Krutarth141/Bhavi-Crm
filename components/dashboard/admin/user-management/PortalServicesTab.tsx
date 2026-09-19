'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';

interface PortalService {
    id: string;
    name: string;
    icon?: string;
    price_display?: string;
    price_amount?: number;
    service_type?: 'repair' | 'inquiry';
    repair_cat?: string;
    inquiry_type?: string;
    subtitle?: string;
    includes?: string;
    form_fields?: string;
    sort_order?: number;
    is_active: boolean;
}

interface Form {
    id: string;
    name: string;
    icon: string;
    price_display: string;
    price_amount: string;
    service_type: 'repair' | 'inquiry';
    repair_cat: string;
    subtitle: string;
    includes: string;
    sort_order: string;
}

// index.html:12508-12655 (renderPortalServicesTab / openPortalSvcModal /
// savePortalService) — service_type is 'repair' (an engineer visits — Printer
// or Scanner) vs 'inquiry' (customer form, team follows up), not
// carry_in/on_site/both, and repair_cat is printer/scanner only.
const emptyForm: Form = {
    id: '', name: '', icon: '🔧', price_display: '', price_amount: '',
    service_type: 'inquiry', repair_cat: 'printer', subtitle: '', includes: '', sort_order: '99',
};

const fieldStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
    borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const,
};
const labelStyle = {
    display: 'block', marginBottom: '4px', fontWeight: 600,
    fontSize: '11px', color: 'var(--text-muted)',
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
};

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function PortalServicesTab() {
    const [services, setServices] = useState<PortalService[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<Form>(emptyForm);

    const showMsg = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('portal_services')
                .select('id, name, icon, price_display, price_amount, service_type, repair_cat, inquiry_type, subtitle, includes, form_fields, sort_order, is_active')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            setServices(data || []);
        } catch (e: any) {
            showMsg('❌ ' + e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditingId(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (s: PortalService) => {
        let includesText = '';
        try {
            const arr = JSON.parse(s.includes || '[]');
            if (Array.isArray(arr)) includesText = arr.join('\n');
        } catch { /* leave blank */ }
        setEditingId(s.id);
        setForm({
            id: s.id,
            name: s.name || '',
            icon: s.icon || '🔧',
            price_display: s.price_display || '',
            price_amount: s.price_amount != null ? String(s.price_amount) : '0',
            service_type: s.service_type === 'repair' ? 'repair' : 'inquiry',
            repair_cat: s.repair_cat || 'printer',
            subtitle: s.subtitle || '',
            includes: includesText,
            sort_order: s.sort_order != null ? String(s.sort_order) : '99',
        });
        setModalOpen(true);
    };

    // index.html:12617-12645 (savePortalService)
    const handleSave = async () => {
        if (!form.name.trim() || !form.price_display.trim()) {
            showMsg('❌ Service Name and Price Display are required.');
            return;
        }
        const id = editingId || form.id.trim() || slugify(form.name);
        const includes = form.includes.trim()
            ? form.includes.split('\n').map((x) => x.trim()).filter(Boolean)
            : [];
        const data: any = {
            id,
            name: form.name.trim(),
            icon: form.icon.trim() || '🔧',
            price_display: form.price_display.trim(),
            price_amount: Number(form.price_amount) || 0,
            service_type: form.service_type,
            repair_cat: form.service_type === 'repair' ? form.repair_cat : null,
            inquiry_type: form.service_type === 'inquiry' ? form.name.trim() : null,
            subtitle: form.subtitle.trim(),
            includes: JSON.stringify(includes),
            form_fields: JSON.stringify([]),
            sort_order: Number(form.sort_order) || 0,
            is_active: true,
            updated_at: new Date().toISOString(),
        };
        setSaving(true);
        try {
            if (editingId) {
                const { error } = await supabase.from('portal_services').update(data).eq('id', editingId);
                if (error) throw error;
            } else {
                data.created_at = new Date().toISOString();
                const { error } = await supabase.from('portal_services').insert([data]);
                if (error) throw error;
            }
            setModalOpen(false);
            showMsg('✅ Portal service saved!');
            await load();
        } catch (e: any) {
            showMsg('❌ ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (id: string, current: boolean) => {
        try {
            await supabase.from('portal_services').update({ is_active: !current, updated_at: new Date().toISOString() }).eq('id', id);
            await load();
        } catch (e: any) { showMsg('❌ ' + e.message); }
    };

    const handleDelete = async () => {
        if (!editingId) return;
        if (!confirm(`Delete "${form.name}"?`)) return;
        try {
            await supabase.from('portal_services').delete().eq('id', editingId);
            setModalOpen(false);
            await load();
        } catch (e: any) { showMsg('❌ ' + e.message); }
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : '💾 Save Service'}
            </button>
            <button onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            {editingId && (
                <button onClick={handleDelete} style={{ padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, cursor: 'pointer', marginLeft: 'auto' }}>🗑️ Delete</button>
            )}
        </div>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🌐 PORTAL SERVICES</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                        These services appear on the customer booking portal. Changes apply immediately after save.
                    </p>
                </div>
                <button onClick={openAdd} style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                    + Add Service
                </button>
            </div>

            {message && (
                <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12, background: message.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: message.startsWith('✅') ? '#065f46' : '#dc2626' }}>
                    {message}
                </div>
            )}

            {loading ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading...</p>
            ) : services.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No portal services added yet</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {services.map((s) => (
                        <div key={s.id} style={{ background: '#f8fafc', border: `1.5px solid ${s.is_active ? 'var(--border)' : '#fecaca'}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 28, flexShrink: 0 }}>{s.icon || '🔧'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {s.price_display}&nbsp;·&nbsp;
                                    <span style={{ background: s.service_type === 'repair' ? '#dbeafe' : '#e0e7ff', color: s.service_type === 'repair' ? '#1d4ed8' : '#4338ca', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                                        {s.service_type === 'repair' ? 'REPAIR' : 'INQUIRY'}
                                    </span>
                                </div>
                                {s.subtitle && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.subtitle}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button onClick={() => openEdit(s)} style={{ padding: '6px 10px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>
                                <button onClick={() => handleToggle(s.id, s.is_active)} style={{ padding: '6px 10px', background: s.is_active ? '#fee2e2' : '#f0fdf4', color: s.is_active ? '#dc2626' : '#059669', border: `1px solid ${s.is_active ? '#fca5a5' : '#86efac'}`, borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>
                                    {s.is_active ? '⏸ Hide' : '▶ Show'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? '✏️ Service Edit' : '➕ New Service Add'} footer={footer}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Icon</label>
                            <input type="text" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={{ ...fieldStyle, fontSize: 24, textAlign: 'center' }} maxLength={4} />
                        </div>
                        <div>
                            <label style={labelStyle}>Service Name *</label>
                            <input type="text" placeholder="e.g. Printer Repair" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={fieldStyle} />
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Price on Portal *</label>
                        <input type="text" placeholder="e.g. ₹649/- or Starting ₹1500/-" value={form.price_display} onChange={e => setForm(f => ({ ...f, price_display: e.target.value }))} style={fieldStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Price Amount (₹) — for comparison only</label>
                        <input type="number" value={form.price_amount} onChange={e => setForm(f => ({ ...f, price_amount: e.target.value }))} style={{ ...fieldStyle, maxWidth: 140 }} />
                    </div>
                    <div>
                        <label style={labelStyle}>Service Type *</label>
                        <select value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value as 'repair' | 'inquiry' }))} style={fieldStyle}>
                            <option value="repair">⚙️ Repair — Engineer visits (Printer / Scanner)</option>
                            <option value="inquiry">📋 Inquiry — Customer form, team follows up</option>
                        </select>
                    </div>
                    {form.service_type === 'repair' && (
                        <div>
                            <label style={labelStyle}>Repair Category</label>
                            <select value={form.repair_cat} onChange={e => setForm(f => ({ ...f, repair_cat: e.target.value }))} style={fieldStyle}>
                                <option value="printer">🖨️ Printer</option>
                                <option value="scanner">🖻 Scanner</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label style={labelStyle}>Short Description</label>
                        <input type="text" placeholder="Shows below the card on the portal" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} style={fieldStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Included Items — one per line</label>
                        <textarea rows={4} placeholder={'Engineer visits your home\nService within 24 hours\nEstimate before work begins'} value={form.includes} onChange={e => setForm(f => ({ ...f, includes: e.target.value }))} style={{ ...fieldStyle, resize: 'vertical' as const }} />
                    </div>
                </div>
            </Modal>
        </div>
    );
}