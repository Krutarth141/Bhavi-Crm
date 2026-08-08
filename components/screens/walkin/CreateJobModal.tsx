'use client';

import { useState } from 'react';
import { WalkInEntry, WalkInProduct } from '@/types/walkin';
import { createTicket } from '@/services/ticketService';
import { updateWalkIn } from '@/services/walkInService';
import { callTypeOptions, serviceTypeOptions, warrantyOptions } from '@/types/tickets';
import { colors, styles } from '@/styles/ticketsStyles';

interface Props {
    entry: WalkInEntry;
    onClose: () => void;
    onCreated: () => Promise<void>;
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

    const otherProducts = (entry.products || []).filter((p) => p !== prod && (p.type === 'Inward' || p.type === 'For Checking Only'));

    const handleSubmit = async () => {
        if (!cname.trim() || !mobile.trim() || !model.trim() || !problem.trim()) {
            setError('Customer name, mobile, model, and problem are required.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const result = await createTicket({
                cname: cname.trim(), mobile: mobile.trim(), alt_mobile: '',
                address, city, state, pin, area,
                brand_name: brandName, model: model.trim(), serial: serial.trim(),
                problem: problem.trim(), description: '',
                call_type: callType, service_type: serviceType, warranty_coverage: warrantyCoverage,
                status: 'Pending Allocation', assigned_name: '',
                service_charges: serviceType === 'On Site' ? 649 : 413,
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

                    <div style={styles.formGrid}>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Customer Name *</label><input value={cname} onChange={(e) => setCname(e.target.value)} style={styles.formInput} /></div>
                        <div style={styles.formGroup}><label style={styles.formLabel}>Mobile *</label><input value={mobile} onChange={(e) => setMobile(e.target.value)} style={styles.formInput} /></div>
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