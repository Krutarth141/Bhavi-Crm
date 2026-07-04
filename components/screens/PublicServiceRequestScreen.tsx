'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createTicket } from '@/services/ticketService';
import { useMasters } from '@/hooks/useMasters';
import { callTypeOptions, serviceTypeOptions, warrantyOptions } from '@/types/tickets';

const INITIAL_FORM = {
    cname: '',
    mobile: '',
    alt_mobile: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    area: '',
    brand_name: '',
    model: '',
    serial: '',
    problem: '',
    description: '',
    call_type: 'Non-Warranty',
    service_type: 'Carry In',
    warranty_coverage: 'Out of Coverage',
};

export default function PublicServiceRequestScreen() {
    const { brands, models, problemTypes, loading } = useMasters();
    const [form, setForm] = useState(INITIAL_FORM);
    const [saving, setSaving] = useState(false);
    const [ticketId, setTicketId] = useState('');
    const [error, setError] = useState('');

    const filteredModels = useMemo(
        () => models.filter((model) => !form.brand_name || model.brand?.name === form.brand_name || brands.find((brand) => brand.id === model.brand_id)?.name === form.brand_name),
        [brands, form.brand_name, models]
    );

    const set = (key: keyof typeof INITIAL_FORM, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const submit = async () => {
        if (!form.cname.trim() || !form.mobile.trim() || !form.brand_name.trim() || !form.model.trim() || !form.problem.trim()) {
            setError('Please fill in the required fields.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const result = await createTicket({
                ...form,
                id: undefined,
                job_sheet: undefined,
                status: 'Pending Allocation',
                assigned_name: '',
                service_charges: form.service_type === 'On Site' ? 649 : 413,
                final_charges: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                call_type: form.call_type,
                service_type: form.service_type,
                warranty_coverage: form.warranty_coverage,
                brand_name: form.brand_name,
                model: form.model,
                problem: form.problem,
                cname: form.cname,
                mobile: form.mobile,
                alt_mobile: form.alt_mobile,
                address: form.address,
                city: form.city,
                state: form.state,
                pin: form.pin,
                area: form.area,
            } as any);

            if (!result.success || !result.id) {
                throw new Error(result.error || 'Failed to create ticket');
            }

            setTicketId(result.id);
        } catch (err: any) {
            setError(err.message || 'Failed to create ticket');
        } finally {
            setSaving(false);
        }
    };

    if (ticketId) {
        return (
            <div style={styles.page}>
                <div style={styles.panel}>
                    <div style={styles.successIcon}>✅</div>
                    <h1 style={styles.title}>Request submitted</h1>
                    <p style={styles.subtitle}>Your ticket is created and saved in the CRM.</p>
                    <div style={styles.ticketBox}>
                        <div style={styles.ticketLabel}>Ticket ID</div>
                        <div style={styles.ticketValue}>{ticketId}</div>
                    </div>
                    <p style={styles.helper}>Our team will contact you shortly.</p>
                    <div style={styles.actions}>
                        <Link href="/" style={styles.secondaryButton}>Back to Home</Link>
                        <Link href="/walk-in" style={styles.primaryButton}>Customer Check-in</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.panel}>
                <div style={styles.header}>
                    <div>
                        <div style={styles.kicker}>Service Request</div>
                        <h1 style={styles.title}>Book a repair, AMC, or onsite visit.</h1>
                        <p style={styles.subtitle}>This flow uses the same ticket table and status pipeline as the internal CRM.</p>
                    </div>
                    <Link href="/" style={styles.backLink}>Home</Link>
                </div>

                <div style={styles.quickLinks}>
                    <Link href="/service-request/repair-type" style={styles.quickLink}>Repair Type</Link>
                    <Link href="/service-request/terms" style={styles.quickLink}>Terms</Link>
                    <Link href="/service-request/warranty" style={styles.quickLink}>Warranty</Link>
                    <Link href="/service-request/product" style={styles.quickLink}>Product</Link>
                    <Link href="/service-request/signature" style={styles.quickLink}>Signature</Link>
                </div>

                <div style={styles.tabRow}>
                    {serviceTypeOptions.map((type) => (
                        <button key={type} type="button" onClick={() => set('service_type', type)} style={{ ...styles.tabButton, ...(form.service_type === type ? styles.tabButtonActive : {}) }}>
                            {type}
                        </button>
                    ))}
                </div>

                <div style={styles.grid}>
                    <Field label="Customer Name *" value={form.cname} onChange={(value) => set('cname', value)} placeholder="Full name" />
                    <Field label="Mobile *" value={form.mobile} onChange={(value) => set('mobile', value)} placeholder="10 digit mobile" type="tel" />
                    <Field label="Alternate Mobile" value={form.alt_mobile} onChange={(value) => set('alt_mobile', value)} placeholder="Optional" type="tel" />
                    <Field label="City" value={form.city} onChange={(value) => set('city', value)} placeholder="City" />
                    <Field label="State" value={form.state} onChange={(value) => set('state', value)} placeholder="State" />
                    <Field label="Pin Code" value={form.pin} onChange={(value) => set('pin', value)} placeholder="Pin code" />
                </div>

                <div style={styles.grid}>
                    <Field label="Address" value={form.address} onChange={(value) => set('address', value)} placeholder="House no, street, landmark" full />
                </div>

                <div style={styles.grid}>
                    <SelectField label="Brand *" value={form.brand_name} onChange={(value) => set('brand_name', value)} options={['', ...brands.map((brand) => brand.name)]} />
                    <SelectField label="Model *" value={form.model} onChange={(value) => set('model', value)} options={['', ...filteredModels.map((model) => model.model_name || model.model_no)]} />
                    <Field label="Serial" value={form.serial} onChange={(value) => set('serial', value)} placeholder="Optional" />
                    <SelectField label="Call Type" value={form.call_type} onChange={(value) => set('call_type', value)} options={callTypeOptions} />
                    <SelectField label="Warranty" value={form.warranty_coverage} onChange={(value) => set('warranty_coverage', value)} options={warrantyOptions} />
                    <Field label="Issue *" value={form.problem} onChange={(value) => set('problem', value)} placeholder="What is the problem?" full />
                    <Field label="Additional Notes" value={form.description} onChange={(value) => set('description', value)} placeholder="Optional details" full />
                </div>

                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.actions}>
                    <Link href="/" style={styles.secondaryButton}>Cancel</Link>
                    <button type="button" onClick={submit} disabled={saving || loading} style={styles.primaryButton}>
                        {saving ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, placeholder, type = 'text', full = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; full?: boolean }) {
    return (
        <label style={{ ...styles.field, ...(full ? styles.full : {}) }}>
            <span style={styles.label}>{label}</span>
            <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={styles.input} />
        </label>
    );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
    return (
        <label style={styles.field}>
            <span style={styles.label}>{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)} style={styles.input}>
                {options.map((option) => (
                    <option key={option || 'empty'} value={option}>
                        {option || 'Select'}
                    </option>
                ))}
            </select>
        </label>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', padding: 16, background: 'linear-gradient(180deg, #0f172a 0%, #f4f7fc 20%, #f8fbff 100%)' },
    panel: { maxWidth: 1100, margin: '0 auto', background: '#fff', borderRadius: 28, padding: 24, boxShadow: '0 24px 80px rgba(15, 23, 42, 0.16)' },
    header: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' },
    kicker: { textTransform: 'uppercase', letterSpacing: '0.16em', color: '#1d4ed8', fontSize: 12, fontWeight: 900 },
    title: { margin: '6px 0 0', fontSize: 34, color: '#0f172a', lineHeight: 1.05 },
    subtitle: { margin: '10px 0 0', color: '#475569', maxWidth: 740, lineHeight: 1.6 },
    backLink: { textDecoration: 'none', color: '#1d4ed8', fontWeight: 900, background: '#eff6ff', padding: '10px 14px', borderRadius: 12 },
    quickLinks: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 },
    quickLink: { textDecoration: 'none', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: 999, fontWeight: 800, fontSize: 12 },
    tabRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
    tabButton: { border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', padding: '10px 14px', borderRadius: 14, fontWeight: 900, cursor: 'pointer' },
    tabButtonActive: { background: '#1d4ed8', color: '#fff', borderColor: '#1d4ed8' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 },
    field: { display: 'flex', flexDirection: 'column', gap: 8 },
    full: { gridColumn: '1 / -1' },
    label: { fontSize: 12, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' },
    input: { border: '1px solid #dbe4f0', borderRadius: 14, padding: '12px 14px', fontSize: 15, outline: 'none', background: '#fbfdff' },
    actions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18, flexWrap: 'wrap' },
    primaryButton: { border: 'none', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 900, cursor: 'pointer' },
    secondaryButton: { border: '1px solid #dbe4f0', background: '#fff', color: '#0f172a', padding: '12px 18px', borderRadius: 14, fontWeight: 900, textDecoration: 'none' },
    error: { marginTop: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: 12, borderRadius: 14 },
    successIcon: { fontSize: 54, marginBottom: 8 },
    ticketBox: { marginTop: 18, background: 'linear-gradient(135deg, #0f172a, #1d4ed8)', color: '#fff', borderRadius: 20, padding: 18 },
    ticketLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.75 },
    ticketValue: { fontSize: 32, fontWeight: 900, marginTop: 6 },
    helper: { color: '#475569', marginTop: 14 },
};