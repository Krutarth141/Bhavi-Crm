'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAMC } from '@/hooks/useAMC';
import AMCTable from '@/components/screens/amc/AMCTable';
import AMCFormModal from '@/components/screens/amc/AMCFormModal';
import { AMCFormData, AMCContract, emptyAMCForm, isExpired, isExpiringSoon, todayStr } from '@/types/amc';

export default function AMCScreen() {
    const { data: session } = useSession();
    const adminName = (session?.user as any)?.name ?? 'Admin';

    const { contracts, loading, error, active, expiring, expired, refetch, create, remove } = useAMC();

    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [form, setForm] = useState<AMCFormData>({ ...emptyAMCForm, amc_start: todayStr() });

    const filtered = contracts.filter((c: AMCContract) => {
        const q = search.toLowerCase();
        const matchSearch = !search.trim() ||
            c.customer_name?.toLowerCase().includes(q) ||
            c.mobile?.includes(q) ||
            c.product?.toLowerCase().includes(q) ||
            c.serial_no?.toLowerCase().includes(q);
        const matchStatus = !statusFilter ||
            (statusFilter === 'active' && !isExpired(c.amc_end) && !isExpiringSoon(c.amc_end)) ||
            (statusFilter === 'expiring' && isExpiringSoon(c.amc_end)) ||
            (statusFilter === 'expired' && isExpired(c.amc_end));
        return matchSearch && matchStatus;
    });

    const handleSave = async () => {
        if (!form.customer_name.trim()) { alert('Customer name required'); return; }
        setSaving(true);
        const result = await create(form, adminName);
        if (result.success) {
            setModalOpen(false);
            setForm({ ...emptyAMCForm, amc_start: todayStr() });
        } else {
            alert('Error: ' + result.error);
        }
        setSaving(false);
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete AMC for "${name}"?`)) return;
        const result = await remove(id);
        if (!result.success) alert('Error: ' + result.error);
    };

    const handleChange = (key: keyof AMCFormData, value: string) =>
        setForm(f => ({ ...f, [key]: value }));

    return (
        <div style={{ padding: '20px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🔄 AMC Contracts ({contracts.length})</h1>
                <button onClick={() => setModalOpen(true)} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                    ➕ Add Contract
                </button>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total', value: contracts.length, color: '#185FA5' },
                    { label: '✅ Active', value: active, color: '#059669' },
                    { label: '⚠️ Expiring', value: expiring, color: '#d97706' },
                    { label: '❌ Expired', value: expired, color: '#dc2626' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search customer, mobile, product, serial..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14 }}>
                    <option value="">All Status</option>
                    <option value="active">✅ Active</option>
                    <option value="expiring">⚠️ Expiring Soon</option>
                    <option value="expired">❌ Expired</option>
                </select>
            </div>

            {/* Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>Loading...</p>
                ) : (
                    <AMCTable contracts={filtered} onDelete={handleDelete} />
                )}
            </div>

            <AMCFormModal isOpen={modalOpen} form={form} saving={saving} onClose={() => setModalOpen(false)} onSave={handleSave} onChange={handleChange} />
        </div>
    );
}