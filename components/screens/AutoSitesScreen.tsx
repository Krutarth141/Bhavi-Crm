'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAutoSites } from '@/hooks/useAutoSites';
import Modal from '@/components/Modal';
import { SiteFormData, emptySiteForm, AutoSite } from '@/types/autoSites';
import { fetchSiteItems, fetchSiteVisits, addSiteVisit } from '@/services/autoSitesService';

const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const, fontFamily: 'inherit' };

export default function AutoSitesScreen() {
    const { data: session } = useSession();
    const userId = (session?.user as any)?.user_id ?? '';
    const userName = (session?.user as any)?.name ?? 'Admin';

    const { sites, loading, error, add, remove } = useAutoSites();
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [detailSite, setDetailSite] = useState<AutoSite | null>(null);
    const [siteItems, setSiteItems] = useState<any[]>([]);
    const [siteVisits, setSiteVisits] = useState<any[]>([]);
    const [detailTab, setDetailTab] = useState<'items' | 'visits'>('items');
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState<SiteFormData>(emptySiteForm);

    // Visit form
    const [visitForm, setVisitForm] = useState({ visit_date: '', work_done: '', material_delivered: '' });
    const [addingVisit, setAddingVisit] = useState(false);

    const filtered = sites.filter(s => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return s.site_name?.toLowerCase().includes(q) || s.client_name?.toLowerCase().includes(q) || s.mobile?.includes(q);
    });

    const handleAdd = async () => {
        if (!form.site_name.trim() || !form.client_name.trim()) { alert('Site name and client name required'); return; }
        setSaving(true);
        const r = await add(form, userId);
        if (r.success) { setAddModalOpen(false); setForm(emptySiteForm); }
        else alert('Error: ' + r.error);
        setSaving(false);
    };

    const openDetail = async (site: AutoSite) => {
        setDetailSite(site);
        const [items, visits] = await Promise.all([fetchSiteItems(site.id), fetchSiteVisits(site.id)]);
        setSiteItems(items);
        setSiteVisits(visits);
    };

    const handleAddVisit = async () => {
        if (!visitForm.visit_date || !detailSite) return;
        setAddingVisit(true);
        const r = await addSiteVisit(detailSite.id, { visit_date: visitForm.visit_date, work_done: visitForm.work_done, material_delivered: visitForm.material_delivered, created_by: userId, created_by_name: userName });
        if (r.success) {
            setVisitForm({ visit_date: '', work_done: '', material_delivered: '' });
            const visits = await fetchSiteVisits(detailSite.id);
            setSiteVisits(visits);
        } else alert('Error: ' + r.error);
        setAddingVisit(false);
    };

    const addModalFooter = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setAddModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : '💾 Add Site'}
            </button>
        </div>
    );

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🏗️ Auto Sites ({sites.length})</h1>
                <button onClick={() => setAddModalOpen(true)} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>➕ New Site</button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            <div style={{ marginBottom: 16 }}>
                <input type="text" placeholder="Search site name, client, mobile..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : filtered.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No sites found</p>
                    : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                            {filtered.map(s => (
                                <div key={s.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>{s.site_name}</div>
                                        <button onClick={() => { if (confirm(`Delete "${s.site_name}"?`)) remove(s.id); }} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}>🗑️</button>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>👤 {s.client_name}</div>
                                    {s.mobile && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>📞 {s.mobile}</div>}
                                    {s.address && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>📍 {s.address}</div>}
                                    <button onClick={() => openDetail(s)} style={{ width: '100%', padding: '7px 0', background: '#eff6ff', color: '#185FA5', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                                        📋 View Details
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

            {/* Add Site Modal */}
            <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="🏗️ New Site" footer={addModalFooter}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Site Name *</label><input type="text" value={form.site_name} onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Client Name *</label><input type="text" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Mobile</label><input type="tel" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} style={fieldStyle} /></div>
                    </div>
                    <div><label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>Address</label><textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
                </div>
            </Modal>

            {/* Site Detail Modal */}
            <Modal isOpen={!!detailSite} onClose={() => setDetailSite(null)} title={`📋 ${detailSite?.site_name || ''}`}>
                {detailSite && (
                    <div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
                            {(['items', 'visits'] as const).map(tab => (
                                <button key={tab} onClick={() => setDetailTab(tab)} style={{ padding: '7px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: detailTab === tab ? 600 : 400, color: detailTab === tab ? '#185FA5' : '#6b7280', borderBottom: detailTab === tab ? '2px solid #185FA5' : '2px solid transparent', marginBottom: -1 }}>
                                    {tab === 'items' ? `📦 Items (${siteItems.length})` : `📅 Visits (${siteVisits.length})`}
                                </button>
                            ))}
                        </div>

                        {detailTab === 'items' ? (
                            siteItems.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No items added</p> : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead><tr style={{ background: '#f9fafb' }}>
                                        {['Item', 'Qty', 'Unit Price', 'Total', 'Delivery'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                        {siteItems.map(item => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{item.item_name}</td>
                                                <td style={{ padding: '8px 10px' }}>{item.qty} {item.unit || ''}</td>
                                                <td style={{ padding: '8px 10px' }}>₹{item.unit_price || 0}</td>
                                                <td style={{ padding: '8px 10px', fontWeight: 600 }}>₹{item.total_price || 0}</td>
                                                <td style={{ padding: '8px 10px', fontSize: 11 }}>
                                                    <span style={{ padding: '1px 6px', borderRadius: 8, background: item.delivery_status === 'delivered' ? '#d1fae5' : '#fef3c7', color: item.delivery_status === 'delivered' ? '#065f46' : '#92400e' }}>
                                                        {item.delivery_status || 'pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        ) : (
                            <div>
                                {/* Add visit form */}
                                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                        <input type="date" value={visitForm.visit_date} onChange={e => setVisitForm(f => ({ ...f, visit_date: e.target.value }))} style={fieldStyle} />
                                        <input type="text" placeholder="Work done" value={visitForm.work_done} onChange={e => setVisitForm(f => ({ ...f, work_done: e.target.value }))} style={fieldStyle} />
                                    </div>
                                    <input type="text" placeholder="Material delivered" value={visitForm.material_delivered} onChange={e => setVisitForm(f => ({ ...f, material_delivered: e.target.value }))} style={{ ...fieldStyle, marginBottom: 8 }} />
                                    <button onClick={handleAddVisit} disabled={addingVisit} style={{ padding: '6px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                                        {addingVisit ? 'Adding...' : '➕ Add Visit'}
                                    </button>
                                </div>
                                {siteVisits.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No visits yet</p> : (
                                    siteVisits.map(v => (
                                        <div key={v.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{v.visit_date} {v.visit_time || ''}</div>
                                            <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{v.work_done || '—'}</div>
                                            {v.material_delivered && <div style={{ fontSize: 12, color: '#6b7280' }}>Material: {v.material_delivered}</div>}
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>By: {v.created_by_name || v.created_by || '—'}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}