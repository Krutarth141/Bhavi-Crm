'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { SiteContact, ContactForm, emptyContactForm, CONTACT_AGENCIES } from '@/types/autoSites';

interface Props {
    siteName: string;
    contacts: SiteContact[];
    onClose: () => void;
    onAdd: (form: ContactForm) => Promise<{ success: boolean; error?: string }>;
    onDelete: (id: number) => void;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 };

export default function SiteContactsModal({ siteName, contacts, onClose, onAdd, onDelete }: Props) {
    const [form, setForm] = useState<ContactForm>(emptyContactForm);
    const [saving, setSaving] = useState(false);

    const set = (patch: Partial<ContactForm>) => setForm(f => ({ ...f, ...patch }));

    const handleAdd = async () => {
        if (!form.agency.trim() || !form.contact_name.trim() || !form.mobile.trim()) { alert('Agency, Name and Mobile are required!'); return; }
        setSaving(true);
        const r = await onAdd(form);
        setSaving(false);
        if (r.success) setForm(emptyContactForm);
        else alert('Error: ' + r.error);
    };

    const footer = (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Close</button>
        </div>
    );

    return (
        <Modal isOpen title={`📞 ${siteName} — Contacts`} onClose={onClose} footer={footer} size="lg">
            {contacts.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No contacts found</p> : (
                <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr style={{ background: '#f9fafb' }}>
                            {['Agency', 'Name', 'Mobile', ''].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {contacts.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '8px 10px' }}>{c.agency}</td>
                                    <td style={{ padding: '8px 10px' }}>{c.contact_name}</td>
                                    <td style={{ padding: '8px 10px' }}><a href={`tel:${c.mobile}`} style={{ color: '#2563eb' }}>{c.mobile}</a></td>
                                    <td style={{ padding: '8px 10px' }}><button onClick={() => onDelete(c.id)} style={{ background: '#fee2e2', border: 'none', color: '#dc2626', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>🗑️</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '4px 0 12px' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>➕ Add New Contact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                    <label style={labelStyle}>Agency *</label>
                    <input list="sc-agency-list" value={form.agency} onChange={e => set({ agency: e.target.value })} placeholder="Mistry, Electrician..." style={fieldStyle} />
                    <datalist id="sc-agency-list">{CONTACT_AGENCIES.map(a => <option key={a} value={a} />)}</datalist>
                </div>
                <div><label style={labelStyle}>Name *</label><input value={form.contact_name} onChange={e => set({ contact_name: e.target.value })} placeholder="Contact person name" style={fieldStyle} /></div>
                <div><label style={labelStyle}>Mobile *</label><input type="tel" value={form.mobile} onChange={e => set({ mobile: e.target.value })} placeholder="Mobile number" style={fieldStyle} /></div>
            </div>
            <button onClick={handleAdd} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save Contact'}</button>
        </Modal>
    );
}