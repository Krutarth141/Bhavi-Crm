'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface PortalService {
    id: string;
    name: string;
    icon?: string;
    price_display?: string;
    price_amount?: number;
    service_type?: string;
    repair_cat?: string;
    subtitle?: string;
    sort_order?: number;
    is_active: boolean;
}

interface Form {
    name: string;
    icon: string;
    price_display: string;
    price_amount: string;
    service_type: string;
    repair_cat: string;
    subtitle: string;
    sort_order: string;
}

const emptyForm: Form = {
    name: '', icon: '', price_display: '', price_amount: '',
    service_type: '', repair_cat: '', subtitle: '', sort_order: '',
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

export default function PortalServicesTab() {
    const [services, setServices] = useState<PortalService[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
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
                .select('id, name, icon, price_display, price_amount, service_type, repair_cat, subtitle, sort_order, is_active')
                .order('sort_order', { ascending: true })
                .order('name');
            if (error) throw error;
            setServices(data || []);
        } catch (e: any) {
            showMsg('❌ ' + e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!form.name.trim()) { showMsg('❌ Service name is required'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.from('portal_services').insert([{
                name: form.name.trim(),
                icon: form.icon.trim() || null,
                price_display: form.price_display.trim() || null,
                price_amount: form.price_amount ? Number(form.price_amount) : null,
                service_type: form.service_type || null,
                repair_cat: form.repair_cat || null,
                subtitle: form.subtitle.trim() || null,
                sort_order: form.sort_order ? Number(form.sort_order) : null,
                is_active: true,
            }]);
            if (error) throw error;
            setForm(emptyForm);
            showMsg('✅ Portal service added!');
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

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        try {
            await supabase.from('portal_services').delete().eq('id', id);
            await load();
        } catch (e: any) { showMsg('❌ ' + e.message); }
    };

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🌐 PORTAL SERVICES</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    MANAGE CUSTOMER-FACING SERVICE OFFERINGS — SHOWN ON PORTAL / INQUIRY FORMS.
                </p>
            </div>

            {message && (
                <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12, background: message.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: message.startsWith('✅') ? '#065f46' : '#dc2626' }}>
                    {message}
                </div>
            )}

            {/* Add form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                    <label style={labelStyle}>SERVICE NAME *</label>
                    <input type="text" placeholder="e.g. Camera Repair" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>ICON (emoji)</label>
                    <input type="text" placeholder="e.g. 📷" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={fieldStyle} maxLength={4} />
                </div>
                <div>
                    <label style={labelStyle}>SUBTITLE</label>
                    <input type="text" placeholder="e.g. Canon Authorized" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>PRICE DISPLAY</label>
                    <input type="text" placeholder="e.g. ₹500 onwards" value={form.price_display} onChange={e => setForm(f => ({ ...f, price_display: e.target.value }))} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>PRICE AMOUNT (₹)</label>
                    <input type="number" placeholder="500" value={form.price_amount} onChange={e => setForm(f => ({ ...f, price_amount: e.target.value }))} style={fieldStyle} />
                </div>
                <div>
                    <label style={labelStyle}>SERVICE TYPE</label>
                    <select value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} style={fieldStyle}>
                        <option value="">Select Type</option>
                        <option value="carry_in">🏠 Carry In</option>
                        <option value="on_site">🚗 On Site</option>
                        <option value="both">Both</option>
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>REPAIR CATEGORY</label>
                    <select value={form.repair_cat} onChange={e => setForm(f => ({ ...f, repair_cat: e.target.value }))} style={fieldStyle}>
                        <option value="">Select Category</option>
                        <option value="camera">📷 Camera</option>
                        <option value="printer">🖨️ Printer</option>
                        <option value="electronics">⚡ Electronics</option>
                        <option value="automation">🏠 Automation</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>SORT ORDER</label>
                    <input type="number" placeholder="1" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} style={fieldStyle} />
                </div>
            </div>

            <button onClick={handleAdd} disabled={saving} style={{ padding: '8px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 20, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Adding...' : '+ Add Portal Service'}
            </button>

            {/* Table */}
            {loading ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading...</p>
            ) : services.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No portal services added yet</p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr><th>#</th><th>SERVICE</th><th>TYPE</th><th>CATEGORY</th><th>PRICE</th><th>STATUS</th><th>ACTION</th></tr>
                        </thead>
                        <tbody>
                            {services.map((s, i) => (
                                <tr key={s.id}>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.sort_order ?? i + 1}</td>
                                    <td>
                                        <strong>{s.icon ? `${s.icon} ` : ''}{s.name}</strong>
                                        {s.subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.subtitle}</div>}
                                    </td>
                                    <td style={{ fontSize: 12 }}>{s.service_type === 'carry_in' ? '🏠 Carry In' : s.service_type === 'on_site' ? '🚗 On Site' : s.service_type || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{s.repair_cat || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{s.price_display || (s.price_amount ? `₹${s.price_amount}` : '—')}</td>
                                    <td>
                                        <span onClick={() => handleToggle(s.id, s.is_active)} style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: s.is_active ? '#d1fae5' : '#fee2e2', color: s.is_active ? '#065f46' : '#991b1b' }}>
                                            {s.is_active ? '✅ Active' : '❌ Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <button onClick={() => handleDelete(s.id, s.name)} style={{ padding: '4px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                                            🗑️ Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}