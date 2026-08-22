'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAMC } from '@/hooks/useAMC';
import { fetchCompanyInfo } from '@/services/settingsService';
import AMCTable from '@/components/screens/amc/AMCTable';
import AMCFormModal from '@/components/screens/amc/AMCFormModal';
import { AMCFormData, AMCContract, emptyAMCForm, isExpired, isExpiringSoon } from '@/types/amc';

export default function AMCScreen() {
    const { data: session } = useSession();
    const adminName = (session?.user as any)?.name ?? 'Admin';

    const { contracts, loading, error, active, expiring, expired, revenue, refetch, create, update, remove } = useAMC();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [modalTitle, setModalTitle] = useState('➕ Add AMC Contract');
    const [saveLabel, setSaveLabel] = useState('💾 Save Contract');
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [form, setForm] = useState<AMCFormData>({ ...emptyAMCForm });

    const filtered = contracts.filter((c: AMCContract) => {
        const q = search.toLowerCase();
        const matchSearch = !search.trim() ||
            c.customer_name?.toLowerCase().includes(q) ||
            c.mobile?.includes(q) ||
            c.product?.toLowerCase().includes(q) ||
            c.serial_no?.toLowerCase().includes(q);
        const matchStatus = !statusFilter ||
            (statusFilter === 'active' && !isExpired(c.amc_end)) ||
            (statusFilter === 'expiring' && isExpiringSoon(c.amc_end)) ||
            (statusFilter === 'expired' && isExpired(c.amc_end));
        return matchSearch && matchStatus;
    });

    const openAdd = () => {
        setEditingId(null);
        setModalTitle('➕ Add AMC Contract');
        setSaveLabel('💾 Save Contract');
        setForm({ ...emptyAMCForm });
        setModalOpen(true);
    };

    const openEdit = (c: AMCContract) => {
        setEditingId(c.id);
        setModalTitle('✏️ Edit AMC Contract');
        setSaveLabel('💾 Save Changes');
        setForm({
            customer_name: c.customer_name || '', mobile: c.mobile || '', product: c.product || '',
            serial_no: c.serial_no || '', amc_start: c.amc_start || '', amc_end: c.amc_end || '',
            amc_amount: c.amc_amount != null ? String(c.amc_amount) : '', amc_type: c.amc_type || 'Comprehensive',
            visits_included: c.visits_included != null ? String(c.visits_included) : '',
            address: c.address || '', notes: c.notes || '',
        });
        setModalOpen(true);
    };

    const openRenew = (c: AMCContract) => {
        setEditingId(null);
        setModalTitle(`🔄 Renew AMC — ${c.customer_name}`);
        setSaveLabel('💾 Save Contract');
        const oldEnd = c.amc_end ? new Date(c.amc_end) : new Date();
        const newStart = new Date(oldEnd);
        newStart.setDate(newStart.getDate() + 1);
        const newEnd = new Date(newStart);
        newEnd.setFullYear(newEnd.getFullYear() + 1);
        newEnd.setDate(newEnd.getDate() - 1);
        setForm({
            customer_name: c.customer_name || '', mobile: c.mobile || '', product: c.product || '',
            serial_no: c.serial_no || '', amc_type: c.amc_type || 'Comprehensive',
            visits_included: c.visits_included != null ? String(c.visits_included) : '',
            address: c.address || '', amc_amount: c.amc_amount != null ? String(c.amc_amount) : '',
            amc_start: newStart.toISOString().slice(0, 10), amc_end: newEnd.toISOString().slice(0, 10),
            notes: `Renewed from previous AMC (${c.amc_start || ''} to ${c.amc_end || ''})`,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.customer_name.trim() || !form.mobile.trim() || !form.amc_start || !form.amc_end) {
            alert('Please fill Customer Name, Mobile, Start and End dates.');
            return;
        }
        setSaving(true);
        const result = editingId ? await update(editingId, form) : await create(form, adminName);
        if (result.success) {
            alert('✅ AMC saved successfully!');
            setModalOpen(false);
            setForm({ ...emptyAMCForm });
            setEditingId(null);
        } else {
            alert('Error: ' + result.error);
        }
        setSaving(false);
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm('Delete this AMC contract? This cannot be undone.')) return;
        const result = await remove(id);
        if (!result.success) alert('Error: ' + result.error);
    };

    const handleWhatsApp = async (c: AMCContract) => {
        if (!c.mobile) { alert('No mobile number on this contract'); return; }
        const ci = await fetchCompanyInfo();
        const endDate = c.amc_end ? new Date(c.amc_end) : new Date();
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
        const statusText = daysLeft < 0 ? `has expired on ${c.amc_end}` : daysLeft === 0 ? 'expires today!' : `expires in ${daysLeft} days (${c.amc_end})`;
        const companyName = ci?.company_name || 'Bhavi Electronics';
        const msg = `Dear ${c.customer_name},\n\n`
            + `This is a reminder from *${companyName}*.\n\n`
            + `Your AMC contract ${statusText}.\n\n`
            + `📋 *AMC Details:*\n`
            + `• Product: ${c.product || '—'}\n`
            + (c.serial_no ? `• Serial No: ${c.serial_no}\n` : '')
            + `• Type: ${c.amc_type || 'Comprehensive'}\n`
            + `• Valid: ${c.amc_start} to ${c.amc_end}\n`
            + (c.amc_amount ? `• Amount: ₹${Number(c.amc_amount).toLocaleString('en-IN')}\n` : '\n')
            + `\nTo renew your AMC or for service support, please contact us:\n`
            + (ci?.phone ? `📞 ${ci.phone}\n` : '')
            + (ci?.email ? `📧 ${ci.email}\n` : '')
            + `\nThank you for choosing ${companyName}!`;
        let mob = c.mobile.replace(/\D/g, '');
        if (mob.length === 10) mob = '91' + mob;
        window.open(`https://wa.me/${mob}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleChange = (key: keyof AMCFormData, value: string) =>
        setForm(f => ({ ...f, [key]: value }));

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🔄 AMC Contracts ({contracts.length})</h1>
                <button onClick={openAdd} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                    ➕ Add Contract
                </button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total', value: String(contracts.length), color: '#185FA5' },
                    { label: '✅ Active', value: String(active), color: '#059669' },
                    { label: '⚠️ Expiring', value: String(expiring), color: '#d97706' },
                    { label: '❌ Expired', value: String(expired), color: '#dc2626' },
                    { label: '💰 Total Revenue', value: `₹${revenue.toLocaleString('en-IN')}`, color: '#7c3aed' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search customer, mobile, product, serial..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All Status</option>
                    <option value="active">✅ Active</option>
                    <option value="expiring">⚠️ Expiring Soon</option>
                    <option value="expired">❌ Expired</option>
                </select>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>Loading...</p>
                ) : (
                    <AMCTable contracts={filtered} onEdit={openEdit} onRenew={openRenew} onWhatsApp={handleWhatsApp} onDelete={handleDelete} />
                )}
            </div>

            <AMCFormModal isOpen={modalOpen} title={modalTitle} saveLabel={saveLabel} form={form} saving={saving} onClose={() => setModalOpen(false)} onSave={handleSave} onChange={handleChange} />
        </div>
    );
}