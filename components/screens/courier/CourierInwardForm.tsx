'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CourierProduct, emptyCourierProduct } from '@/types/courier';
import CourierProductRow from './CourierProductRow';
import { colors, styles } from '@/styles/ticketsStyles';

interface CourierInwardFormProps {
  onSave: (data: any) => Promise<void>;
  loading: boolean;
}

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  color: colors.text,
  backgroundColor: colors.card,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const errorStyle: React.CSSProperties = {
  color: colors.danger,
  fontSize: '11px',
  marginTop: '3px',
};

export default function CourierInwardForm({ onSave, loading }: CourierInwardFormProps) {
  const [form, setForm] = useState({
    awb_no: '',
    agency: '',
    person_name: '',
    sender_mobile: '',
    place: '',
    weight: '',
  });
  const [products, setProducts] = useState<CourierProduct[]>([emptyCourierProduct()]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.from('models').select('model_no').order('model_no').limit(500).then(({ data }) => {
      setModelOptions(Array.from(new Set((data || []).map((m: any) => m.model_no))));
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.awb_no.trim()) errors.awb_no = 'AWB No is required';
    if (!form.agency.trim()) errors.agency = 'Courier Agency is required';
    if (!form.place.trim()) errors.place = 'From Place is required';
    if (!form.person_name.trim()) errors.person_name = 'Sender name is required';
    if (!form.sender_mobile.trim()) errors.sender_mobile = 'Sender mobile number is required';
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errors = validate();
    if (Object.keys(errors).length > 0) return;

    const cleanProducts = products.filter(p => p.model.trim() || p.serial.trim());

    await onSave({
      awb_no: form.awb_no.trim(),
      agency: form.agency.trim(),
      person_name: form.person_name.trim(),
      sender_mobile: form.sender_mobile.trim(),
      place: form.place.trim(),
      receiver_id: null,
      receiver_data: null,
      weight: form.weight ? parseFloat(form.weight) : null,
      products: cleanProducts,
      product_count: cleanProducts.length,
    });

    setForm({ awb_no: '', agency: '', person_name: '', sender_mobile: '', place: '', weight: '' });
    setProducts([emptyCourierProduct()]);
    setSubmitted(false);
  };

  const errors = submitted ? validate() : {};

  return (
    <div style={{ ...styles.card, marginBottom: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: colors.text, marginTop: 0, marginBottom: '16px' }}>
        📥 New Inward Entry
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={styles.formLabel}>AWB No *</label>
            <input type="text" name="awb_no" value={form.awb_no} onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.awb_no ? colors.danger : colors.border }}
              placeholder="Paste AWB number" />
            {errors.awb_no && <div style={errorStyle}>{errors.awb_no}</div>}
          </div>
          <div>
            <label style={styles.formLabel}>Courier Agency *</label>
            <input type="text" name="agency" value={form.agency} onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.agency ? colors.danger : colors.border }}
              placeholder="e.g. BlueDart, DTDC, FedEx" />
            {errors.agency && <div style={errorStyle}>{errors.agency}</div>}
          </div>
          <div>
            <label style={styles.formLabel}>Sent By (Sender Name) *</label>
            <input type="text" name="person_name" value={form.person_name} onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.person_name ? colors.danger : colors.border }}
              placeholder="Sender / party name" />
            {errors.person_name && <div style={errorStyle}>{errors.person_name}</div>}
          </div>
          <div>
            <label style={styles.formLabel}>Sender Mobile *</label>
            <input type="tel" name="sender_mobile" value={form.sender_mobile} onChange={handleChange} maxLength={15}
              style={{ ...inputStyle, borderColor: errors.sender_mobile ? colors.danger : colors.border }}
              placeholder="Sender's mobile number" />
            {errors.sender_mobile && <div style={errorStyle}>{errors.sender_mobile}</div>}
          </div>
          <div>
            <label style={styles.formLabel}>From Place *</label>
            <input type="text" name="place" value={form.place} onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.place ? colors.danger : colors.border }}
              placeholder="City/Location" />
            {errors.place && <div style={errorStyle}>{errors.place}</div>}
          </div>
          <div>
            <label style={styles.formLabel}>Weight (kg)</label>
            <input type="number" name="weight" value={form.weight} onChange={handleChange} step="0.1" min="0"
              style={inputStyle} placeholder="e.g. 1.5" />
          </div>
        </div>

        <hr style={styles.divider} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>
            Products <span style={{ fontSize: 11, color: colors.warning, fontWeight: 400 }}>(optional — can be added later)</span>
          </label>
          <button type="button" style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }}
            onClick={() => setProducts(prev => [emptyCourierProduct(), ...prev])}>+ Add Product</button>
        </div>
        {products.map((p, idx) => (
          <CourierProductRow
            key={idx}
            index={idx}
            product={p}
            isOutward={false}
            showCondition
            modelOptions={modelOptions}
            onChange={(np) => setProducts(prev => prev.map((x, i) => i === idx ? np : x))}
            onRemove={products.length > 1 ? () => setProducts(prev => prev.filter((_, i) => i !== idx)) : undefined}
          />
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="submit" disabled={loading}
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '⏳ Saving...' : '📥 Save Inward Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}