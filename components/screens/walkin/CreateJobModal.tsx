'use client';

import { useEffect, useState } from 'react';
import { WalkInEntry, WalkInProduct } from '@/types/walkin';
import { createTicket } from '@/services/ticketService';
import { updateWalkIn } from '@/services/walkInService';
import { callTypeOptions, serviceTypeOptions, warrantyOptions } from '@/types/tickets';
import { colors, styles } from '@/styles/ticketsStyles';
import { supabase } from '@/lib/supabase';

interface Props {
    entry: WalkInEntry;
    onClose: () => void;
    onCreated: () => Promise<void>;
}

// index.html:5466-5508 (handleCallTypeChange / applyModelServiceFields) — the
// service charge is only auto-filled/required for these "Non-Warranty family"
// call types; Warranty / Warranty Repeat / AMC calls carry no charge here.
const NON_WARRANTY_CALL_TYPES = ['Non-Warranty', 'Non-Warranty Repeat', 'Other'];

interface ModelChargeRow {
    model_no: string;
    carry_in_charge: number | null;
    onsite_charge: number | null;
}

function firstServiceProduct(entry: WalkInEntry): WalkInProduct | undefined {
    return entry.products?.find((p) => p.type === 'Inward' || p.type === 'For Checking Only') || entry.products?.[0];
}

function warrantyToCallType(warranty?: string): string {
    if (warranty === 'In Warranty' || warranty === 'Warranty') return 'Warranty';
    return 'Non-Warranty';
}

function extractProblem(remarks?: string): string {
    if (!remarks) return '';
    const parts = remarks.split('|');
    return parts[parts.length - 1].trim();
}

export default function CreateJobModal({ entry, onClose, onCreated }: Props) {
    const prod = firstServiceProduct(entry);

    const [cname, setCname] = useState(entry.customer_name || '');
    const [mobile, setMobile] = useState(entry.mobile || '');
    const [altMobile, setAltMobile] = useState('');
    const [brandName, setBrandName] = useState(prod?.brand || '');
    const [model, setModel] = useState(prod?.model || '');
    const [serial, setSerial] = useState(prod?.serial || '');
    const [problem, setProblem] = useState(extractProblem(prod?.remarks));
    const [callType, setCallType] = useState(warrantyToCallType(prod?.warranty));
    const [serviceType, setServiceType] = useState('Carry In');
    const [warrantyCoverage, setWarrantyCoverage] = useState('Out of Coverage');
    const [address, setAddress] = useState(entry.address || '');
    const [city, setCity] = useState(entry.city || '');
    const [state, setState] = useState(entry.state || '');
    const [pin, setPin] = useState(entry.pin || '');
    const [area, setArea] = useState(entry.area || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [models, setModels] = useState<ModelChargeRow[]>([]);
    const [serviceCharges, setServiceCharges] = useState('');
    const [prevTickets, setPrevTickets] = useState<{ id: string; model?: string; problem?: string; status?: string }[]>([]);

    const isNonWarranty = NON_WARRANTY_CALL_TYPES.includes(callType);

    // index.html:5480-5508 applyModelServiceFields — model master carries the
    // per-mode charge (carry_in_charge / onsite_charge), looked up by model_no.
    useEffect(() => {
        supabase.from('models').select('model_no, carry_in_charge, onsite_charge').limit(2000)
            .then(({ data }) => setModels((data || []) as ModelChargeRow[]));
    }, []);

    useEffect(() => {
        if (!isNonWarranty) return; // Warranty family: charge row stays hidden/zeroed
        const modelNo = model.trim().toLowerCase();
        if (!modelNo) return;
        const m = models.find((x) => (x.model_no || '').trim().toLowerCase() === modelNo);
        if (!m) return;
        const charge = serviceType === 'On Site' ? m.onsite_charge : m.carry_in_charge;
        if (charge != null) setServiceCharges(String(charge));
    }, [isNonWarranty, model, serviceType, models]);

    // index.html:17119-17148 createJobFromWalkIn — customers-table fallback
    // (fills alt mobile / address / area / state+city+pin only when the
    // walk-in entry itself didn't already have them) plus a "Previous Jobs"
    // lookup (last 5 tickets for this mobile) shown for reference.
    useEffect(() => {
        if (!entry.mobile) return;
        (async () => {
            try {
                const { data: custs } = await supabase.from('customers').select('*')
                    .eq('mobile', entry.mobile).order('updated_at', { ascending: false }).limit(1);
                const c = custs?.[0];
                if (c) {
                    if (!entry.address && c.address) setAddress(c.address);
                    if (!entry.area && c.area) setArea(c.area);
                    if (c.alt_mobile) setAltMobile(c.alt_mobile);
                    if (c.state && !entry.city && !entry.pin) {
                        setState(c.state);
                        if (c.city) setCity(c.city);
                        if (c.pin) setPin(c.pin);
                    }
                }
            } catch { /* best-effort fallback, same as HTML's silent catch */ }

            try {
                const { data: tickets } = await supabase.from('tickets').select('id, model, problem, status')
                    .eq('mobile', entry.mobile).order('created_at', { ascending: false }).limit(5);
                setPrevTickets(tickets || []);
            } catch { /* best-effort, same as HTML's silent catch */ }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entry.mobile]);

    const otherProducts = (entry.products || []).filter((p) => p !== prod && (p.type === 'Inward' || p.type === 'For Checking Only'));

    const handleSubmit = async () => {
        if (!cname.trim() || !mobile.trim() || !model.trim() || !problem.trim()) {
            setError('Customer name, mobile, model, and problem are required.');
            return;
        }
        if (isNonWarranty && !serviceCharges.trim()) {
            setError('Service Charge is required for Non-Warranty calls.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const result = await createTicket({
                cname: cname.trim(), mobile: mobile.trim(), alt_mobile: altMobile.trim(),
                address, city, state, pin, area,
                brand_name: brandName, model: model.trim(), serial: serial.trim(),
                problem: problem.trim(), description: '',
                call_type: callType, service_type: serviceType, warranty_coverage: warrantyCoverage,
                status: 'Pending Allocation', assigned_name: '',
                // index.html:5677-5678 — only Non-Warranty-family calls carry a charge.
                service_charges: isNonWarranty ? (Number(serviceCharges) || 0) : 0,
                final_charges: 0,
                created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            } as any);

            if (!result.success || !result.id) throw new Error(result.error || 'Failed to create ticket');

            await updateWalkIn(entry.id, { job_id: result.id });
            await onCreated();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create job');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{ ...styles.modal, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>🔧 Create Job from Walk-in — Token #{entry.token_no}</h2>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div style={{ padding: 20 }}>
                    <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1d4ed8' }}>
                        Customer details auto-filled from the walk-in entry. Please verify Serial No and Problem before saving.
                    </div>
                    {otherProducts.length > 0 && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#166534' }}>
                            This walk-in has {otherProducts.length + 1} products — only the first is filled in here. Remaining:
                            {otherProducts.map((p, i) => <div key={i}>• {p.brand ? `${p.brand} ` : ''}{p.model} ({p.warranty || '?'}){p.remarks ? ` — ${p.remarks}` : ''}</div>)}
                        </div>
                    )}
                    {prevTickets.length > 0 && (
                        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>📋 Previous Jobs ({prevTickets.length})</div>
                            {prevTickets.map((t) => (
                                <div key={t.id} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #fde68a', display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{t.id}</span>
                                    <span style={{ color: '#64748b' }}>{t.model} — {t.problem}</span>
                                    <span style={{ marginLeft: 'auto', fontSize: 11, background: '#f1f5f9', padding: '1px 6px', borderRadius: 99 }}>{t.status}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={styles.formGrid}>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Customer Name *</label><input value={cname} onChange={(e) => setCname(e.target.value)} style={styles.formInput} /></div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Mobile *</label><input value={mobile} onChange={(e) => setMobile(e.target.value)} style={styles.formInput} /></div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Alt Mobile</label><input value={altMobile} onChange={(e) => setAltMobile(e.target.value)} style={styles.formInput} /></div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Brand</label><input value={brandName} onChange={(e) => setBrandName(e.target.value)} style={styles.formInput} /></div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Model *</label><input value={model} onChange={(e) => setModel(e.target.value)} style={styles.formInput} /></div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Serial No</label><input value={serial} onChange={(e) => setSerial(e.target.value)} style={styles.formInput} /></div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Call Type</label>
                            <select value={callType} onChange={(e) => setCallType(e.target.value)} style={styles.formInput}>
                                {callTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Service Type</label>
                            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} style={styles.formInput}>
                                {serviceTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Warranty Coverage</label>
                            <select value={warrantyCoverage} onChange={(e) => setWarrantyCoverage(e.target.value)} style={styles.formInput}>
                                {warrantyOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        {isNonWarranty && (
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>💰 Service / Labour Charges (₹) *</label>
                                <input type="number" min={0} step={50} value={serviceCharges} onChange={(e) => setServiceCharges(e.target.value)} style={styles.formInput} placeholder="Required — enter amount" />
                            </div>
                        )}
                        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}><label style={styles.formLabel}>Problem *</label><input value={problem} onChange={(e) => setProblem(e.target.value)} style={styles.formInput} /></div>
                        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}><label style={styles.formLabel}>Address</label><input value={address} onChange={(e) => setAddress(e.target.value)} style={styles.formInput} /></div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>City</label><input value={city} onChange={(e) => setCity(e.target.value)} style={styles.formInput} /></div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>State</label><input value={state} onChange={(e) => setState(e.target.value)} style={styles.formInput} /></div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Pin</label><input value={pin} onChange={(e) => setPin(e.target.value)} style={styles.formInput} /></div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Area</label><input value={area} onChange={(e) => setArea(e.target.value)} style={styles.formInput} /></div>
                    </div>
                    {error && <div style={{ color: colors.danger, fontSize: 13, marginTop: 8 }}>{error}</div>}
                </div>
                <div style={styles.modalFooter}>
                    <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={onClose}>Cancel</button>
                    <button style={{ ...styles.btn, ...styles.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Creating...' : '💾 Create Job'}
                    </button>
                </div>
            </div>
        </div>
    );
}