'use client';

import { useState } from 'react';
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
    sender_name: '',
    from_place: '',
    weight: '',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.awb_no.trim()) errors.awb_no = 'AWB No is required';
    if (!form.agency.trim()) errors.agency = 'Courier Agency is required';
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errors = validate();
    if (Object.keys(errors).length > 0) return;

    await onSave({
      awb_no: form.awb_no.trim(),
      agency: form.agency.trim(),
      sender_name: form.sender_name.trim() || null,
      from_place: form.from_place.trim() || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      description: form.description.trim() || null,
    });

    // Reset form after successful save
    setForm({ awb_no: '', agency: '', sender_name: '', from_place: '', weight: '', description: '' });
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
            <input
              type="text"
              name="awb_no"
              value={form.awb_no}
              onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.awb_no ? colors.danger : colors.border }}
              placeholder="Enter AWB number"
            />
            {errors.awb_no && <div style={errorStyle}>{errors.awb_no}</div>}
          </div>
          <div>
            <label style={styles.formLabel}>Courier Agency *</label>
            <input
              type="text"
              name="agency"
              value={form.agency}
              onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.agency ? colors.danger : colors.border }}
              placeholder="e.g. DTDC, BlueDart"
            />
            {errors.agency && <div style={errorStyle}>{errors.agency}</div>}
          </div>
          <div>
            <label style={styles.formLabel}>Sender Name</label>
            <input
              type="text"
              name="sender_name"
              value={form.sender_name}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Sender name"
            />
          </div>
          <div>
            <label style={styles.formLabel}>From Place</label>
            <input
              type="text"
              name="from_place"
              value={form.from_place}
              onChange={handleChange}
              style={inputStyle}
              placeholder="City / Location"
            />
          </div>
          <div>
            <label style={styles.formLabel}>Weight (kg)</label>
            <input
              type="number"
              name="weight"
              value={form.weight}
              onChange={handleChange}
              style={inputStyle}
              placeholder="0.0"
              step="0.1"
              min="0"
            />
          </div>
          <div>
            <label style={styles.formLabel}>Description</label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Package contents"
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Saving...' : '📥 Save Inward Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
