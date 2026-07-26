'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CourierEntry, CourierProduct, emptyCourierProduct } from '@/types/courier';
import { updateCourierEntry } from '@/services/courierService';
import CourierProductRow from './CourierProductRow';
import { colors, styles } from '@/styles/ticketsStyles';

interface Props {
    entry: CourierEntry;
    onClose: () => void;
    onSaved: () => Promise<void>;
}

const fieldStyle: React.CSSProperties = { border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };

export default function CourierEditModal({ entry, onClose, onSaved }: Props) {
    const isIn = entry.direction === 'Inward';
    const [awb, setAwb] = useState(entry.awb_no || '');
    const [agency, setAgency] = useState(entry.agency || '');
    const [person, setPerson] = useState(entry.person_name || '');
    const [place, setPlace] = useState(entry.place || '');
    const [weight, setWeight] = useState(entry.weight != null ? String(entry.weight) : '');
    const [products, setProducts] = useState<CourierProduct[]>(entry.products && entry.products.length ? entry.products : []);
    const [modelOptions, setModelOptions] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase.from('models').select('model_no').order('model_no').limit(500).then(({ data }) => {
            setModelOptions((data || []).map((m: any) => m.model_no));
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const cleanProducts = products.filter(p => p.model.trim() || p.serial.trim());
        // Matches the real HTML edit-modal behaviour: condition / condition_note
        // are not editable here and get dropped from the saved product.
        const savedProducts = cleanProducts.map(p => ({
            model: p.model, serial: p.serial, call_id: p.call_id, warranty: p.warranty,
            accessories: p.accessories,
            ...(!isIn ? { faulty_part: p.faulty_part || 'No', invoice_avail: p.invoice_avail || 'No', invoice_amount: p.invoice_amount || '' } : {}),
        }));
        const result = await updateCourierEntry(entry.id, {
            awb_no: awb.trim(),
            agency: agency.trim(),
            person_name: person.trim() || null,
            place: place.trim(),
            weight: weight ? parseFloat(weight) : null,
            products: savedProducts as CourierProduct[],
            product_count: savedProducts.length,
        });
        setSaving(false);
        if (!result.success) { alert('Error: ' + result.error); return; }
        await onSaved();
    };

    return (
        <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={{ ...styles.modal, maxWidth: 560 }}>
                <div style={styles.modalHeader}>
                    <div style={styles.modalTitle}>{isIn ? '📥' : '📤'} Edit — {entry.awb_no || 'AWB Pending'}</div>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div style={styles.modalBody}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 14 }}>
                        <div><label style={styles.formLabel}>AWB No</label><input value={awb} onChange={e => setAwb(e.target.value)} style={fieldStyle} /></div>
                        <div><label style={styles.formLabel}>Agency</label><input value={agency} onChange={e => setAgency(e.target.value)} style={fieldStyle} /></div>
                        <div><label style={styles.formLabel}>{isIn ? 'Sender' : 'Receiver'}</label><input value={person} onChange={e => setPerson(e.target.value)} style={fieldStyle} /></div>
                        <div><label style={styles.formLabel}>{isIn ? 'From' : 'To'} Place</label><input value={place} onChange={e => setPlace(e.target.value)} style={fieldStyle} /></div>
                        <div><label style={styles.formLabel}>⚖️ Weight (kg)</label><input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 1.5" style={fieldStyle} /></div>
                    </div>
                    <hr style={{ margin: '0 0 12px', border: 'none', borderTop: `1px solid ${colors.border}` }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <label style={{ fontWeight: 600, fontSize: 13 }}>📦 Products</label>
                        <button type="button" style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={() => setProducts(prev => [...prev, emptyCourierProduct()])}>+ Add Product</button>
                    </div>
                    {products.map((p, idx) => (
                        <CourierProductRow
                            key={idx}
                            index={idx}
                            product={p}
                            isOutward={!isIn}
                            showCondition={false}
                            modelOptions={modelOptions}
                            onChange={(np) => setProducts(prev => prev.map((x, i) => i === idx ? np : x))}
                            onRemove={() => setProducts(prev => prev.filter((_, i) => i !== idx))}
                        />
                    ))}
                    <button onClick={handleSave} disabled={saving} style={{ ...styles.btn, ...styles.btnPrimary, width: '100%', marginTop: 12, opacity: saving ? 0.7 : 1 }}>
                        {saving ? 'Saving...' : '💾 Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}