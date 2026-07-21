'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAutoSites } from '@/hooks/useAutoSites';
import Modal from '@/components/Modal';
import { SiteFormData, emptySiteForm, AutoSite, AutoSiteItem, AutoSitePayment, AutoSiteDispatch, SiteContact, SiteItemForm, PaymentForm, ContactForm } from '@/types/autoSites';
import {
    fetchSiteItems, fetchSiteVisits, addSiteVisit, fetchSitePayments,
    addSiteItem, updateSiteItem, deleteSiteItem, markItemDelivered,
    addSitePayment, deleteSitePayment, updateSite,
    fetchSiteDispatches, createDispatch,
    fetchSiteContacts, addSiteContact, deleteSiteContact,
} from '@/services/autoSitesService';
import { printPaymentReceipt } from '@/utils/printSiteReceipt';
import { printDeliveryChallan } from '@/utils/printSiteDC';
import { printQuotation } from '@/utils/printQuotation';
import SiteItemFormModal from '@/components/screens/auto-sites/SiteItemFormModal';
import SitePaymentModal from '@/components/screens/auto-sites/SitePaymentModal';
import MarkDeliveredModal from '@/components/screens/auto-sites/MarkDeliveredModal';
import DispatchModal from '@/components/screens/auto-sites/DispatchModal';
import SiteContactsModal from '@/components/screens/auto-sites/SiteContactsModal';
import TCSelectorModal from '@/components/screens/auto-sites/TCSelectorModal';

const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const, fontFamily: 'inherit' };
const btnIcon = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 5px' } as const;

export default function AutoSitesScreen() {
    const { data: session } = useSession();
    const userId = (session?.user as any)?.user_id ?? '';
    const userName = (session?.user as any)?.name ?? 'Admin';

    const { sites, payMap, itemMap, loading, error, add, remove, refetch } = useAutoSites();
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<AutoSite | null>(null);
    const [detailSite, setDetailSite] = useState<AutoSite | null>(null);
    const [siteItems, setSiteItems] = useState<AutoSiteItem[]>([]);
    const [siteVisits, setSiteVisits] = useState<any[]>([]);
    const [sitePayments, setSitePayments] = useState<AutoSitePayment[]>([]);
    const [siteDispatches, setSiteDispatches] = useState<AutoSiteDispatch[]>([]);
    const [detailTab, setDetailTab] = useState<'items' | 'visits'>('items');
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState<SiteFormData>(emptySiteForm);

    const [visitForm, setVisitForm] = useState({ visit_date: '', work_done: '', material_delivered: '' });
    const [addingVisit, setAddingVisit] = useState(false);

    const [itemFormOpen, setItemFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AutoSiteItem | null>(null);
    const [deliverItem, setDeliverItem] = useState<AutoSiteItem | null>(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [contactsSite, setContactsSite] = useState<AutoSite | null>(null);
    const [siteContacts, setSiteContacts] = useState<SiteContact[]>([]);
    const [tcSelectorOpen, setTcSelectorOpen] = useState(false);

    const filtered = sites.filter(s => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return s.site_name?.toLowerCase().includes(q) || s.client_name?.toLowerCase().includes(q) || s.mobile?.includes(q);
    });

    const handleSaveSite = async () => {
        if (!form.site_name.trim() || !form.client_name.trim()) { alert('Site name and client name required'); return; }
        setSaving(true);
        const r = editingSite ? await updateSite(editingSite.id, form) : await add(form, userId);
        if (r.success) { setAddModalOpen(false); setEditingSite(null); setForm(emptySiteForm); refetch(); }
        else alert('Error: ' + r.error);
        setSaving(false);
    };

    const openEditSite = (site: AutoSite) => {
        setEditingSite(site);
        setForm({ site_name: site.site_name, client_name: site.client_name, mobile: site.mobile || '', address: site.address || '' });
        setAddModalOpen(true);
    };

    const openDetail = async (site: AutoSite) => {
        setDetailSite(site);
        const [items, visits, payments, dispatches] = await Promise.all([fetchSiteItems(site.id), fetchSiteVisits(site.id), fetchSitePayments(site.id), fetchSiteDispatches(site.id)]);
        setSiteItems(items);
        setSiteVisits(visits);
        setSitePayments(payments);
        setSiteDispatches(dispatches);
    };

    const openContacts = async (site: AutoSite) => {
        setContactsSite(site);
        setSiteContacts(await fetchSiteContacts(site.id));
    };

    const handleAddContact = async (contactForm: ContactForm) => {
        if (!contactsSite) return { success: false, error: 'No site selected' };
        const r = await addSiteContact(contactsSite.id, contactForm);
        if (r.success) setSiteContacts(await fetchSiteContacts(contactsSite.id));
        return r;
    };

    const handleDeleteContact = async (id: number) => {
        if (!confirm('Delete this contact?') || !contactsSite) return;
        const r = await deleteSiteContact(id);
        if (r.success) setSiteContacts(await fetchSiteContacts(contactsSite.id));
        else alert('Error: ' + r.error);
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

    const grandSell = siteItems.reduce((a, i) => a + (i.total_price || Math.round((i.unit_price || 0) * (i.qty || 0) * (1 + (i.gst_percent || 0) / 100))), 0);
    const totalPaid = sitePayments.reduce((a, p) => a + (p.amount || 0), 0);
    const pending = grandSell - totalPaid;
    const delivCount = siteItems.filter(i => i.delivery_status === 'delivered').length;
    const pendingItems = siteItems.filter(i => i.delivery_status !== 'delivered');

    const handleItemSave = async (itemForm: SiteItemForm) => {
        if (!detailSite) return { success: false, error: 'No site selected' };
        const r = editingItem ? await updateSiteItem(editingItem.id, itemForm) : await addSiteItem(detailSite.id, itemForm);
        if (r.success) {
            const items = await fetchSiteItems(detailSite.id);
            setSiteItems(items);
            refetch();
        }
        return r;
    };

    const handleDeleteItem = async (item: AutoSiteItem) => {
        if (!confirm(`Remove "${item.item_name}" from this site?`) || !detailSite) return;
        const r = await deleteSiteItem(item.id);
        if (r.success) {
            const items = await fetchSiteItems(detailSite.id);
            setSiteItems(items);
            refetch();
        } else alert('Error: ' + r.error);
    };

    const handleMarkDelivered = async (params: { deliveredQty: number; date: string; via: string; by: string; note: string }) => {
        if (!deliverItem || !detailSite) return { success: false, error: 'No item selected' };
        const r = await markItemDelivered(deliverItem.id, { ...params, totalQty: deliverItem.qty || 0 });
        if (r.success) {
            const items = await fetchSiteItems(detailSite.id);
            setSiteItems(items);
            refetch();
        }
        return r;
    };

    const handlePaymentSave = async (payForm: PaymentForm) => {
        if (!detailSite) return { success: false, error: 'No site selected' };
        const paidBeforeThis = totalPaid;
        const r = await addSitePayment(detailSite.id, payForm, userId);
        if (r.success) {
            const payments = await fetchSitePayments(detailSite.id);
            setSitePayments(payments);
            refetch();
            printPaymentReceipt({
                id: r.id || Date.now(),
                site_name: detailSite.site_name,
                quotation_total: grandSell,
                paid_before: paidBeforeThis,
                amount: Number(payForm.amount) || 0,
                payment_mode: payForm.payment_mode,
                payment_date: payForm.payment_date,
                reference_no: payForm.reference_no,
                note: payForm.note,
            });
        }
        return r;
    };

    const handleDeletePayment = async (id: number) => {
        if (!confirm('Delete this payment record?') || !detailSite) return;
        const r = await deleteSitePayment(id);
        if (r.success) {
            const payments = await fetchSitePayments(detailSite.id);
            setSitePayments(payments);
            refetch();
        } else alert('Error: ' + r.error);
    };

    const handleDispatchSave = async (params: { date: string; mode: string; deliveredBy: string; receiverName: string; notes: string; items: { item: AutoSiteItem; qty: number }[] }) => {
        if (!detailSite) return { success: false, error: 'No site selected' };
        const r = await createDispatch({ siteId: detailSite.id, ...params, createdBy: userId });
        if (r.success) {
            const [items, dispatches] = await Promise.all([fetchSiteItems(detailSite.id), fetchSiteDispatches(detailSite.id)]);
            setSiteItems(items);
            setSiteDispatches(dispatches);
            refetch();
            printDeliveryChallan({
                siteName: detailSite.site_name,
                dcNumber: r.dcNumber || '',
                dispatchDate: params.date,
                receiverName: params.receiverName,
                deliveryDetail: `${params.mode}${params.deliveredBy ? ' | ' + params.deliveredBy : ''}`,
                engineerName: userName,
                items: params.items.map(d => ({ item_name: d.item.item_name, qty: d.qty, unit: d.item.unit, note: d.item.note })),
            });
        }
        return r;
    };

    const handleReprintDC = (d: AutoSiteDispatch) => {
        let its: any[] = [];
        try { its = JSON.parse(d.items || '[]'); } catch { /* ignore */ }
        printDeliveryChallan({
            siteName: detailSite?.site_name || '',
            dcNumber: d.dc_number || '',
            dispatchDate: d.dispatch_date || '',
            receiverName: d.receiver_name,
            deliveryDetail: d.delivery_mode + (d.delivery_detail ? ` | ${d.delivery_detail}` : ''),
            engineerName: userName,
            items: its.map((i: any) => ({ item_name: i.item_name, qty: i.qty, unit: i.unit })),
        });
    };

    const handleApplyTC = (tcLines: string[]) => {
        setTcSelectorOpen(false);
        if (!detailSite) return;
        printQuotation({
            items: siteItems,
            siteName: detailSite.site_name,
            address: detailSite.address,
            mobile: detailSite.mobile,
            paid: totalPaid,
            tcLines,
        });
    };

    const addModalFooter = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setAddModalOpen(false); setEditingSite(null); }} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSaveSite} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : (editingSite ? '💾 Update Site' : '💾 Add Site')}
            </button>
        </div>
    );

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🏗️ Auto Sites ({sites.length})</h1>
                <button onClick={() => { setEditingSite(null); setForm(emptySiteForm); setAddModalOpen(true); }} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>➕ New Site</button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            <div style={{ marginBottom: 16 }}>
                <input type="text" placeholder="Search site name, client, mobile..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
                : filtered.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No sites found</p>
                    : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                            {filtered.map(s => {
                                const paid = payMap[s.id] || 0;
                                const agg = itemMap[s.id] || { total: 0, delivered: 0, value: 0 };
                                const quotTotal = agg.value;
                                const sitePending = quotTotal - paid;
                                const delivPct = agg.total > 0 ? Math.round(agg.delivered / agg.total * 100) : 0;
                                const delivColor = delivPct === 100 ? '#065f46' : delivPct > 0 ? '#d97706' : '#6b7280';
                                const delivBg = delivPct === 100 ? '#f0fdf4' : delivPct > 0 ? '#fff7ed' : '#f3f4f6';
                                return (
                                    <div key={s.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderLeft: '4px solid #7c3aed', borderRadius: 8, padding: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: '#7c3aed' }}>🏗️ {s.site_name}</div>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button onClick={() => openContacts(s)} title="Contacts" style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}>📞</button>
                                                <button onClick={() => openEditSite(s)} title="Edit" style={{ background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}>✏️</button>
                                                <button onClick={() => { if (confirm(`Delete "${s.site_name}"? This also deletes its items, visits, and payments.`)) remove(s.id); }} title="Delete" style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}>🗑️</button>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>👤 {s.client_name}</div>
                                        {s.mobile && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>📞 {s.mobile}</div>}
                                        {s.address && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>📍 {s.address}</div>}
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                                            {quotTotal > 0 && <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>📋 ₹{quotTotal.toLocaleString('en-IN')}</span>}
                                            {paid > 0 && <span style={{ fontSize: 11, background: '#f0fdf4', color: '#065f46', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>✅ Paid ₹{paid.toLocaleString('en-IN')}</span>}
                                            {sitePending > 0 && <span style={{ fontSize: 11, background: '#fff7ed', color: '#d97706', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>⏳ Pending ₹{sitePending.toLocaleString('en-IN')}</span>}
                                            {agg.total > 0 && <span style={{ fontSize: 11, background: delivBg, color: delivColor, padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>📦 {agg.delivered}/{agg.total} Delivered{delivPct === 100 ? ' ✅' : ''}</span>}
                                        </div>
                                        <button onClick={() => openDetail(s)} style={{ width: '100%', padding: '7px 0', background: '#eff6ff', color: '#185FA5', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                                            📋 View Details
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

            {/* Add / Edit Site Modal */}
            <Modal isOpen={addModalOpen} onClose={() => { setAddModalOpen(false); setEditingSite(null); }} title={editingSite ? '✏️ Edit Site' : '🏗️ New Site'} footer={addModalFooter}>
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
            <Modal isOpen={!!detailSite} onClose={() => setDetailSite(null)} title={`📋 ${detailSite?.site_name || ''}`} size="lg">
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
                            <div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                                        <div style={{ fontSize: 11, color: '#6b7280' }}>📋 Quotation</div>
                                        <div style={{ fontSize: 15, fontWeight: 700 }}>₹{grandSell.toLocaleString('en-IN')}</div>
                                    </div>
                                    <div style={{ background: '#f9fafb', border: '1px solid #0e9f6e', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                                        <div style={{ fontSize: 11, color: '#6b7280' }}>✅ Paid</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: '#0e9f6e' }}>₹{totalPaid.toLocaleString('en-IN')}</div>
                                    </div>
                                    <div style={{ background: '#f9fafb', border: '1px solid #d97706', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                                        <div style={{ fontSize: 11, color: '#6b7280' }}>⏳ Pending</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: '#d97706' }}>₹{Math.max(0, pending).toLocaleString('en-IN')}</div>
                                    </div>
                                    <div style={{ background: '#f9fafb', border: '1px solid #7c3aed', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                                        <div style={{ fontSize: 11, color: '#6b7280' }}>📦 Delivery</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed' }}>{delivCount}/{siteItems.length}</div>
                                    </div>
                                </div>

                                {siteItems.length === 0 ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No items added</p> : (
                                    <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead><tr style={{ background: '#f9fafb' }}>
                                                {['Item', 'Qty', 'Purchase ₹', 'Selling ₹', 'Total', 'Delivery', ''].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>)}
                                            </tr></thead>
                                            <tbody>
                                                {siteItems.map(item => {
                                                    const sell = item.total_price || Math.round((item.unit_price || 0) * (item.qty || 0) * (1 + (item.gst_percent || 0) / 100));
                                                    const status = item.delivery_status || 'pending';
                                                    const badge = status === 'delivered'
                                                        ? <span style={{ background: '#dcfce7', color: '#065f46', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>🟢 Delivered</span>
                                                        : status === 'partial'
                                                            ? <span style={{ background: '#fef9c3', color: '#854d0e', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>🟡 Partial ({item.delivered_qty || 0}/{item.qty})</span>
                                                            : <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>🔴 Pending</span>;
                                                    return (
                                                        <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                            <td style={{ padding: '8px 10px', fontWeight: 500 }}>{item.item_name}{item.note && <><br /><span style={{ fontSize: 11, color: '#6b7280' }}>{item.note}</span></>}</td>
                                                            <td style={{ padding: '8px 10px' }}>{item.qty} {item.unit || ''}</td>
                                                            <td style={{ padding: '8px 10px', color: '#6b7280' }}>₹{Number(item.purchase_price || 0).toLocaleString('en-IN')}</td>
                                                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>₹{Number(item.unit_price || 0).toLocaleString('en-IN')}</td>
                                                            <td style={{ padding: '8px 10px', fontWeight: 700 }}>₹{sell.toLocaleString('en-IN')}</td>
                                                            <td style={{ padding: '8px 10px' }}>{badge}</td>
                                                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                                                <button onClick={() => { setEditingItem(item); setItemFormOpen(true); }} title="Edit" style={btnIcon}>✏️</button>
                                                                {status !== 'delivered' && <button onClick={() => setDeliverItem(item)} title="Mark Delivered" style={btnIcon}>📦</button>}
                                                                <button onClick={() => handleDeleteItem(item)} title="Remove" style={{ ...btnIcon, color: '#dc2626' }}>🗑️</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {sitePayments.length > 0 && (
                                    <div style={{ marginBottom: 20 }}>
                                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>💰 Payment History</h3>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                <thead><tr style={{ background: '#f9fafb' }}>
                                                    {['Date', 'Amount', 'Mode', 'Ref', 'Note', ''].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>)}
                                                </tr></thead>
                                                <tbody>
                                                    {sitePayments.map((p, idx) => {
                                                        const paidBefore = sitePayments.slice(idx + 1).reduce((s, x) => s + (x.amount || 0), 0);
                                                        return (
                                                            <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                                <td style={{ padding: '8px 10px' }}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                                                                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#065f46' }}>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                                                                <td style={{ padding: '8px 10px' }}>{p.payment_mode}</td>
                                                                <td style={{ padding: '8px 10px' }}>{p.reference_no || '—'}</td>
                                                                <td style={{ padding: '8px 10px' }}>{p.note || '—'}</td>
                                                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                                                    <button onClick={() => printPaymentReceipt({ id: p.id, site_name: detailSite.site_name, quotation_total: grandSell, paid_before: paidBefore, amount: p.amount, payment_mode: p.payment_mode || '', payment_date: p.payment_date || '', reference_no: p.reference_no, note: p.note })} title="Print Receipt" style={btnIcon}>🖨️</button>
                                                                    <button onClick={() => handleDeletePayment(p.id)} title="Delete" style={{ ...btnIcon, color: '#dc2626' }}>🗑️</button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {siteDispatches.length > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📤 Dispatch History</h3>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                <thead><tr style={{ background: '#f9fafb' }}>
                                                    {['Date', 'DC No', 'Mode', 'Items', ''].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>)}
                                                </tr></thead>
                                                <tbody>
                                                    {siteDispatches.map(d => {
                                                        let its: any[] = [];
                                                        try { its = JSON.parse(d.items || '[]'); } catch { /* ignore */ }
                                                        const summary = its.map((i: any) => `${i.qty}x ${i.item_name}`).join(', ');
                                                        return (
                                                            <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                                <td style={{ padding: '8px 10px' }}>{d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString('en-IN') : '—'}</td>
                                                                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{d.dc_number}</td>
                                                                <td style={{ padding: '8px 10px' }}>{d.delivery_mode || '—'}</td>
                                                                <td style={{ padding: '8px 10px', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</td>
                                                                <td style={{ padding: '8px 10px' }}><button onClick={() => handleReprintDC(d)} style={{ padding: '3px 8px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>🖨️ DC</button></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                                    <button onClick={() => { setEditingItem(null); setItemFormOpen(true); }} style={{ padding: '7px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>➕ Add Item</button>
                                    <button onClick={() => setPaymentModalOpen(true)} style={{ padding: '7px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>💰 Add Payment</button>
                                    {pendingItems.length > 0 && <button onClick={() => setDispatchModalOpen(true)} style={{ padding: '7px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>📤 Dispatch Material</button>}
                                    <button onClick={() => setTcSelectorOpen(true)} style={{ padding: '7px 14px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>📄 Quotation</button>
                                </div>
                            </div>
                        ) : (
                            <div>
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

            {itemFormOpen && detailSite && (
                <SiteItemFormModal
                    siteItems={siteItems}
                    editItem={editingItem}
                    onClose={() => { setItemFormOpen(false); setEditingItem(null); }}
                    onSave={handleItemSave}
                />
            )}
            {paymentModalOpen && detailSite && (
                <SitePaymentModal
                    siteName={detailSite.site_name}
                    quotationTotal={grandSell}
                    paidSoFar={totalPaid}
                    onClose={() => setPaymentModalOpen(false)}
                    onSave={handlePaymentSave}
                />
            )}
            {deliverItem && (
                <MarkDeliveredModal
                    item={deliverItem}
                    onClose={() => setDeliverItem(null)}
                    onSave={handleMarkDelivered}
                />
            )}
            {dispatchModalOpen && detailSite && (
                <DispatchModal
                    siteName={detailSite.site_name}
                    pendingItems={pendingItems}
                    onClose={() => setDispatchModalOpen(false)}
                    onSave={handleDispatchSave}
                />
            )}
            {contactsSite && (
                <SiteContactsModal
                    siteName={contactsSite.site_name}
                    contacts={siteContacts}
                    onClose={() => setContactsSite(null)}
                    onAdd={handleAddContact}
                    onDelete={handleDeleteContact}
                />
            )}
            {tcSelectorOpen && (
                <TCSelectorModal
                    onClose={() => setTcSelectorOpen(false)}
                    onApply={handleApplyTC}
                />
            )}
        </div>
    );
}