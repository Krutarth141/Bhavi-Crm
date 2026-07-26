'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CourierReceiver, CourierProduct, emptyCourierProduct } from '@/types/courier';
import CourierProductRow from './CourierProductRow';
import { colors, styles } from '@/styles/ticketsStyles';

interface CourierOutwardFormProps {
  receivers: CourierReceiver[];
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

export default function CourierOutwardForm({ receivers, onSave, loading }: CourierOutwardFormProps) {
  const [form, setForm] = useState({ awb_no: '', agency: '', weight: '' });
  const [search, setSearch] = useState('');
  const [ddOpen, setDdOpen] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState<CourierReceiver | null>(null);
  const [products, setProducts] = useState<CourierProduct[]>([emptyCourierProduct()]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('models').select('model_no').order('model_no').limit(500).then(({ data }) => {
      setModelOptions((data || []).map((m: any) => m.model_no));
    });
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setDdOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const filteredReceivers = receivers.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) || (r.city || '').toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.agency.trim()) errors.agency = 'Courier Agency is required';
    if (!selectedReceiver) errors.receiver = 'Please select a Receiver (from Master)';
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errors = validate();
    const cleanProducts = products.filter(p => p.model.trim() || p.serial.trim());
    if (Object.keys(errors).length > 0) return;
    if (!cleanProducts.length) { alert('Please add at least one product for Outward entries'); return; }

    await onSave({
      awb_no: form.awb_no.trim(),
      agency: form.agency.trim(),
      person_name: selectedReceiver!.name,
      sender_mobile: null,
      place: selectedReceiver!.city || '',
      receiver_id: selectedReceiver!.id,
      receiver_data: {
        name: selectedReceiver!.name, address: selectedReceiver!.address, city: selectedReceiver!.city,
        state: selectedReceiver!.state, pin: selectedReceiver!.pin, phone: selectedReceiver!.phone,
      },
      weight: form.weight ? parseFloat(form.weight) : null,
      products: cleanProducts,
      product_count: cleanProducts.length,
    });

    setForm({ awb_no: '', agency: '', weight: '' });
    setSelectedReceiver(null);
    setSearch('');
    setProducts([emptyCourierProduct()]);
    setSubmitted(false);
  };

  const errors = submitted ? validate() : {};

  return (
    <div style={{ ...styles.card, marginBottom: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: colors.text, marginTop: 0, marginBottom: '16px' }}>
        📤 New Outward Entry
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={styles.formLabel}>AWB No <span style={{ color: colors.textMuted, fontSize: 11 }}>(optional — can be added later)</span></label>
            <input type="text" name="awb_no" value={form.awb_no} onChange={handleChange} style={inputStyle} placeholder="Paste AWB number (if applicable)" />
          </div>
          <div>
            <label style={styles.formLabel}>Courier Agency *</label>
            <input type="text" name="agency" value={form.agency} onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.agency ? colors.danger : colors.border }}
              placeholder="e.g. BlueDart, DTDC, FedEx" />
            {errors.agency && <div style={errorStyle}>{errors.agency}</div>}
          </div>
          <div style={{ gridColumn: '1 / -1' }} ref={wrapRef}>
            <label style={styles.formLabel}>Receiver * <span style={{ fontSize: 11, color: colors.textMuted }}>(Select from Master)</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setDdOpen(true); }}
                onFocus={() => setDdOpen(true)}
                autoComplete="off"
                placeholder="Type receiver name to search..."
                style={{ ...inputStyle, borderColor: errors.receiver ? colors.danger : colors.border }}
              />
              {ddOpen && search && filteredReceivers.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 300, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: '100%', top: '100%', left: 0 }}>
                  {filteredReceivers.map(r => (
                    <div key={r.id} onClick={() => { setSelectedReceiver(r); setSearch(r.name); setDdOpen(false); }}
                      style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{r.city || ''} {r.pin ? `— ${r.pin}` : ''} {r.phone ? `| ${r.phone}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.receiver && <div style={errorStyle}>{errors.receiver}</div>}
            {selectedReceiver && (
              <div style={{ display: 'block', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px', marginTop: 6, fontSize: 12 }}>
                <b>{selectedReceiver.name}</b><br />
                {selectedReceiver.address && <>{selectedReceiver.address}<br /></>}
                {selectedReceiver.city}{selectedReceiver.pin ? `, ${selectedReceiver.pin}` : ''}{selectedReceiver.state ? `, ${selectedReceiver.state}` : ''}
                {selectedReceiver.phone && <><br />📞 {selectedReceiver.phone}</>}
              </div>
            )}
          </div>
          <div>
            <label style={styles.formLabel}>Weight (kg)</label>
            <input type="number" name="weight" value={form.weight} onChange={handleChange} step="0.1" min="0" style={inputStyle} placeholder="e.g. 1.5" />
          </div>
        </div>

        <hr style={styles.divider} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>Products *</label>
          <button type="button" style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }}
            onClick={() => setProducts(prev => [emptyCourierProduct(), ...prev])}>+ Add Product</button>
        </div>
        {products.map((p, idx) => (
          <CourierProductRow
            key={idx}
            index={idx}
            product={p}
            isOutward
            showCondition
            modelOptions={modelOptions}
            onChange={(np) => setProducts(prev => prev.map((x, i) => i === idx ? np : x))}
            onRemove={products.length > 1 ? () => setProducts(prev => prev.filter((_, i) => i !== idx)) : undefined}
          />
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="submit" disabled={loading}
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '⏳ Saving...' : '📤 Save Outward Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}