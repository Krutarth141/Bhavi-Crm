'use client';

import Modal from '@/components/Modal';
import { AMCFormData, AMC_TYPES } from '@/types/amc';

interface Props {
    isOpen: boolean;
    form: AMCFormData;
    saving: boolean;
    onClose: () => void;
    onSave: () => void;
    onChange: (key: keyof AMCFormData, value: string) => void;
}

const fieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const, fontFamily: 'inherit' };
const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '14px' };

export default function AMCFormModal({ isOpen, form, saving, onClose, onSave, onChange }: Props) {
    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={onSave} disabled={saving} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : '💾 Save Contract'}
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="➕ Add AMC Contract" footer={footer}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label style={labelStyle}>Customer Name *</label><input type="text" value={form.customer_name} onChange={e => onChange('customer_name', e.target.value)} style={fieldStyle} placeholder="Full name" /></div>
                    <div><label style={labelStyle}>Mobile</label><input type="tel" value={form.mobile} onChange={e => onChange('mobile', e.target.value)} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Product</label><input type="text" value={form.product} onChange={e => onChange('product', e.target.value)} style={fieldStyle} placeholder="e.g. Canon Printer" /></div>
                    <div><label style={labelStyle}>Serial No.</label><input type="text" value={form.serial_no} onChange={e => onChange('serial_no', e.target.value)} style={fieldStyle} /></div>
                    <div>
                        <label style={labelStyle}>AMC Type</label>
                        <select value={form.amc_type} onChange={e => onChange('amc_type', e.target.value)} style={fieldStyle}>
                            {AMC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div><label style={labelStyle}>Amount (₹)</label><input type="number" value={form.amc_amount} onChange={e => onChange('amc_amount', e.target.value)} style={fieldStyle} placeholder="0" /></div>
                    <div><label style={labelStyle}>Start Date</label><input type="date" value={form.amc_start} onChange={e => onChange('amc_start', e.target.value)} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>End Date</label><input type="date" value={form.amc_end} onChange={e => onChange('amc_end', e.target.value)} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Visits Included</label><input type="number" value={form.visits_included} onChange={e => onChange('visits_included', e.target.value)} style={fieldStyle} placeholder="e.g. 4" /></div>
                </div>
                <div><label style={labelStyle}>Address</label><input type="text" value={form.address} onChange={e => onChange('address', e.target.value)} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Notes</label><textarea value={form.notes} onChange={e => onChange('notes', e.target.value)} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
            </div>
        </Modal>
    );
}