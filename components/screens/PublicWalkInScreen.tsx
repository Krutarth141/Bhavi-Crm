'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMasters } from '@/hooks/useMasters';
import { getNextToken, insertWalkIn } from '@/services/walkInService';

const LANGS = [
    { id: 'en', label: 'English', sub: 'English' },
    { id: 'gu', label: 'ગુજરાતી', sub: 'Gujarati' },
    { id: 'hi', label: 'हिन्दी', sub: 'Hindi' },
];

const CATEGORIES = [
    { id: 'camera', icon: '📷', label: 'Camera', needsBrand: true },
    { id: 'printer', icon: '🖨️', label: 'Printer / Scanner', needsBrand: false },
    { id: 'flash', icon: '⚡', label: 'Flash / Lights', needsBrand: true },
    { id: 'projector', icon: '📽️', label: 'Projectors', needsBrand: true },
    { id: 'music', icon: '🎵', label: 'Musical Instruments', needsBrand: false },
    { id: 'accessories', icon: '🎒', label: 'Accessories', needsBrand: false },
    { id: 'ink', icon: '🖨️', label: 'Ink / Cartridge', needsBrand: false },
];

const PURPOSES = [
    { id: 'repair', label: 'Problem in product', type: 'Inward' as const },
    { id: 'eol', label: 'EOL / old product', type: 'Inward' as const },
    { id: 'cleaning', label: 'Service / cleaning', type: 'Inward' as const },
    { id: 'delivery', label: 'Product delivery', type: 'Outward' as const },
];

export default function PublicWalkInScreen() {
    const { brands, models, problemTypes, loading } = useMasters();
    const [step, setStep] = useState(0);
    const [lang, setLang] = useState('en');
    const [token, setToken] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        mobile: '',
        name: '',
        address: '',
        city: '',
        state: '',
        pin: '',
        category: 'camera',
        brand: '',
        purpose: 'repair',
        model: '',
        serial: '',
        problem: '',
    });

    const selectedCategory = CATEGORIES.find((category) => category.id === form.category) || CATEGORIES[0];
    const selectedPurpose = PURPOSES.find((purpose) => purpose.id === form.purpose) || PURPOSES[0];

    const brandOptions = useMemo(() => brands.map((brand) => brand.name), [brands]);
    const modelOptions = useMemo(() => models.map((model) => model.model_no), [models]);
    const problemOptions = useMemo(() => problemTypes.filter((problemType) => problemType.is_active).map((problemType) => problemType.problem), [problemTypes]);

    const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async () => {
        if (!form.mobile.trim() || !form.name.trim() || !form.address.trim() || !form.city.trim() || !form.pin.trim() || !form.model.trim()) {
            setError('Please fill in the required fields.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const today = new Date().toLocaleDateString('en-CA');
            const nextToken = await getNextToken(today);

            const result = await insertWalkIn({
                token_no: nextToken,
                customer_name: form.name.trim(),
                mobile: form.mobile.trim(),
                visit_date: today,
                arrival_time: new Date().toTimeString().slice(0, 5),
                departure_time: '',
                wc_id: 'PUBLIC',
                wc_name: 'Customer Portal',
                products: [
                    {
                        type: selectedPurpose.type,
                        brand: form.brand || selectedCategory.label,
                        model: form.model.trim(),
                        serial: form.serial.trim(),
                        problem: form.problem.trim() || selectedPurpose.label,
                    },
                ],
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to submit check-in');
            }

            setToken(nextToken);
            setStep(999);
        } catch (err: any) {
            setError(err.message || 'Failed to submit check-in');
        } finally {
            setSaving(false);
        }
    };

    if (token !== null) {
        return (
            <div style={styles.page}>
                <div style={styles.panel}>
                    <div style={styles.successIcon}>✅</div>
                    <h1 style={styles.title}>Check-in successful</h1>
                    <p style={styles.subtitle}>Please be seated. Our team will call your token shortly.</p>
                    <div style={styles.tokenCard}>
                        <div style={styles.tokenLabel}>Your Token Number</div>
                        <div style={styles.tokenValue}>{token}</div>
                    </div>
                    <div style={styles.actions}>
                        <Link href="/walk-in" style={styles.secondaryButton}>New Check-in</Link>
                        <Link href="/" style={styles.primaryButton}>Back to Home</Link>
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
                        <div style={styles.kicker}>Customer Check-in</div>
                        <h1 style={styles.title}>Walk in, register, and get a token.</h1>
                        <p style={styles.subtitle}>The flow uses the same walk-in log used inside the CRM, adapted for the public self check-in path.</p>
                    </div>
                    <Link href="/" style={styles.backLink}>Home</Link>
                </div>

                <div style={styles.quickLinks}>
                    <Link href="/service-request/repair-type" style={styles.quickLink}>Repair Type</Link>
                    <Link href="/service-request/terms" style={styles.quickLink}>Terms</Link>
                    <Link href="/service-request/warranty" style={styles.quickLink}>Warranty</Link>
                    <Link href="/service-request/warranty-info" style={styles.quickLink}>Warranty Info</Link>
                    <Link href="/service-request/delivery" style={styles.quickLink}>Delivery</Link>
                </div>

                <div style={styles.progressRow}>
                    {[0, 1, 2, 3].map((idx) => (
                        <div key={idx} style={{ ...styles.progressDot, ...(step === idx ? styles.progressDotActive : step > idx ? styles.progressDotDone : {}) }} />
                    ))}
                </div>

                {step === 0 && (
                    <>
                        <div style={styles.sectionTitle}>Select language</div>
                        <div style={styles.choiceGrid}>
                            {LANGS.map((option) => (
                                <button key={option.id} type="button" onClick={() => { setLang(option.id); setStep(1); }} style={{ ...styles.choiceCard, ...(lang === option.id ? styles.choiceCardActive : {}) }}>
                                    <div style={styles.choiceMain}>{option.label}</div>
                                    <div style={styles.choiceSub}>{option.sub}</div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {step === 1 && (
                    <>
                        <div style={styles.sectionTitle}>Mobile number</div>
                        <Field label="Mobile *" value={form.mobile} onChange={(value) => set('mobile', value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digit mobile" type="tel" />
                        <div style={styles.actions}>
                            <button type="button" onClick={() => setStep(0)} style={styles.secondaryButton}>Back</button>
                            <button type="button" onClick={() => setStep(2)} style={styles.primaryButton}>Next</button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div style={styles.sectionTitle}>Your details</div>
                        <div style={styles.grid}>
                            <Field label="Full Name *" value={form.name} onChange={(value) => set('name', value)} placeholder="Enter your name" />
                            <Field label="Address *" value={form.address} onChange={(value) => set('address', value)} placeholder="House no, street, building" full />
                            <Field label="City *" value={form.city} onChange={(value) => set('city', value)} placeholder="City" />
                            <Field label="State" value={form.state} onChange={(value) => set('state', value)} placeholder="State" />
                            <Field label="Pin *" value={form.pin} onChange={(value) => set('pin', value)} placeholder="Pin code" />
                        </div>
                        <div style={styles.actions}>
                            <button type="button" onClick={() => setStep(1)} style={styles.secondaryButton}>Back</button>
                            <button type="button" onClick={() => setStep(3)} style={styles.primaryButton}>Next</button>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <div style={styles.sectionTitle}>Product / issue</div>
                        <div style={styles.choiceGrid}>
                            {CATEGORIES.map((category) => (
                                <button key={category.id} type="button" onClick={() => set('category', category.id)} style={{ ...styles.choiceCard, ...(form.category === category.id ? styles.choiceCardActive : {}) }}>
                                    <div style={styles.choiceIcon}>{category.icon}</div>
                                    <div style={styles.choiceMain}>{category.label}</div>
                                </button>
                            ))}
                        </div>

                        <div style={styles.grid}>
                            <SelectField label="Brand" value={form.brand} onChange={(value) => set('brand', value)} options={['', ...brandOptions]} />
                            <SelectField label="Purpose" value={form.purpose} onChange={(value) => set('purpose', value)} options={PURPOSES.map((purpose) => purpose.id)} />
                            <SelectField label="Model *" value={form.model} onChange={(value) => set('model', value)} options={['', ...modelOptions]} />
                            <Field label="Serial" value={form.serial} onChange={(value) => set('serial', value)} placeholder="Optional" />
                            <SelectField label="Issue *" value={form.problem} onChange={(value) => set('problem', value)} options={['', ...problemOptions]} />
                        </div>

                        {error && <div style={styles.error}>{error}</div>}

                        <div style={styles.actions}>
                            <button type="button" onClick={() => setStep(2)} style={styles.secondaryButton}>Back</button>
                            <button type="button" onClick={handleSubmit} disabled={saving || loading} style={styles.primaryButton}>{saving ? 'Saving...' : 'Confirm Check-in'}</button>
                        </div>
                    </>
                )}
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
    page: { minHeight: '100vh', padding: 16, background: 'linear-gradient(180deg, #0f172a 0%, #edf3ff 22%, #f8fbff 100%)' },
    panel: { maxWidth: 980, margin: '0 auto', background: '#fff', borderRadius: 28, padding: 24, boxShadow: '0 24px 80px rgba(15, 23, 42, 0.16)' },
    header: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap' },
    kicker: { textTransform: 'uppercase', letterSpacing: '0.16em', color: '#1d4ed8', fontSize: 12, fontWeight: 900 },
    title: { margin: '6px 0 0', fontSize: 34, color: '#0f172a', lineHeight: 1.05 },
    subtitle: { margin: '10px 0 0', color: '#475569', maxWidth: 760, lineHeight: 1.6 },
    backLink: { textDecoration: 'none', color: '#1d4ed8', fontWeight: 900, background: '#eff6ff', padding: '10px 14px', borderRadius: 12 },
    quickLinks: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 },
    quickLink: { textDecoration: 'none', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: 999, fontWeight: 800, fontSize: 12 },
    sectionTitle: { fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 },
    progressRow: { display: 'flex', gap: 8, marginBottom: 18 },
    progressDot: { width: 38, height: 8, borderRadius: 99, background: '#dbe4f0' },
    progressDotActive: { background: '#1d4ed8' },
    progressDotDone: { background: '#22c55e' },
    choiceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 },
    choiceCard: { border: '1px solid #dbe4f0', background: '#f8fbff', padding: 14, borderRadius: 18, textAlign: 'left', cursor: 'pointer' },
    choiceCardActive: { background: '#1d4ed8', color: '#fff', borderColor: '#1d4ed8' },
    choiceMain: { fontSize: 15, fontWeight: 900 },
    choiceSub: { marginTop: 6, fontSize: 12, opacity: 0.8 },
    choiceIcon: { fontSize: 28, marginBottom: 10 },
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
    tokenCard: { marginTop: 18, background: 'linear-gradient(135deg, #0f172a, #1d4ed8)', color: '#fff', borderRadius: 20, padding: 18 },
    tokenLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.75 },
    tokenValue: { fontSize: 32, fontWeight: 900, marginTop: 6 },
};