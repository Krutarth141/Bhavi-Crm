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

function getToday(): string {
  return new Date().toLocaleDateString('en-CA');
}

export default function CourierOutwardForm({ receivers, onSave, loading }: CourierOutwardFormProps) {
  const [form, setForm] = useState({ awb_no: '', agency: '', weight: '', entry_date: getToday() });
  const [search, setSearch] = useState('');
  const [ddOpen, setDdOpen] = useState(false);
  // Unified receiver snapshot — set either by picking a Receiver Master row
  // (id present) or by fetching a past call from CRM by mobile (no id, but
  // selectedCrmTicketId set instead). Mirrors HTML's single
  // window._selectedReceiver + window._selectedCrmTicketId (index.html:
  // 18721-18732, 18762-18776).
  const [selectedReceiver, setSelectedReceiver] = useState<
    { id?: string; name: string; address?: string; city?: string; area?: string; state?: string; pin?: string; phone?: string } | null
  >(null);
  const [selectedCrmTicketId, setSelectedCrmTicketId] = useState<string | null>(null);
  const [crmMobile, setCrmMobile] = useState('');
  const [crmSearching, setCrmSearching] = useState(false);
  const [crmResults, setCrmResults] = useState<any[]>([]);
  const [crmMessage, setCrmMessage] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [products, setProducts] = useState<CourierProduct[]>([emptyCourierProduct()]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fetch Receiver from CRM (by Mobile) — index.html:18740-18761
  // (searchCrmForCourier): exact match on tickets.mobile, most recent 10.
  const searchCrmForCourier = async () => {
    const mobile = crmMobile.trim();
    if (!mobile) { setCrmMessage({ type: 'error', text: 'Enter a mobile number to search.' }); return; }
    setCrmSearching(true);
    setCrmMessage({ type: 'info', text: 'Searching...' });
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, cname, mobile, address, area, city, state, pin, model, problem, call_type, status, created_at')
        .eq('mobile', mobile)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      if (!data || !data.length) {
        setCrmResults([]);
        setCrmMessage({ type: 'info', text: 'No calls found for this mobile — search Receiver Master below, or add the address manually.' });
        return;
      }
      setCrmResults(data);
      setCrmMessage(null);
    } catch (e: any) {
      setCrmResults([]);
      setCrmMessage({ type: 'error', text: 'Error: ' + (e?.message ?? String(e)) });
    } finally {
      setCrmSearching(false);
    }
  };

  // index.html:18762-18776 (selectCrmReceiver)
  const selectCrmReceiver = (ticketId: string) => {
    const t = crmResults.find((x) => x.id === ticketId);
    if (!t) return;
    const r = { name: t.cname || '', address: t.address || '', city: t.city || '', area: t.area || '', state: t.state || '', pin: t.pin || '', phone: t.mobile || '' };
    setSelectedReceiver(r);
    setSelectedCrmTicketId(t.id);
    setSearch(r.name);
    setCrmMessage({ type: 'success', text: `✅ Fetched from ${ticketId} — verify address below before saving.` });
  };

  useEffect(() => {
    supabase.from('models').select('model_no').order('model_no').limit(500).then(({ data }) => {
      setModelOptions(Array.from(new Set((data || []).map((m: any) => m.model_no))));
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
    // A Master pick (id set) or a CRM fetch-by-mobile (selectedCrmTicketId
    // set) both count as a valid receiver — index.html:18124.
    if (!selectedReceiver || (!selectedReceiver.id && !selectedCrmTicketId)) {
      errors.receiver = 'Please select a Receiver (from Master, or fetch from CRM by mobile)';
    }
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
      receiver_id: selectedReceiver!.id || null,
      receiver_data: {
        name: selectedReceiver!.name, address: selectedReceiver!.address, city: selectedReceiver!.city,
        area: selectedReceiver!.area, state: selectedReceiver!.state, pin: selectedReceiver!.pin, phone: selectedReceiver!.phone,
      },
      ticket_id: selectedCrmTicketId || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      entry_date: form.entry_date || getToday(),
      products: cleanProducts,
      product_count: cleanProducts.length,
    });

    setForm({ awb_no: '', agency: '', weight: '', entry_date: getToday() });
    setSelectedReceiver(null);
    setSelectedCrmTicketId(null);
    setCrmMobile('');
    setCrmResults([]);
    setCrmMessage(null);
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
          {/* Fetch Receiver from CRM (by Mobile) — index.html:17843-17850.
              Separate from the Receiver Master picker below (one-off end
              customers vs. repeat vendors/repair centers) — both paths just
              fill the same selectedReceiver + preview box. */}
          <div style={{ gridColumn: '1 / -1', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 12px' }}>
            <label style={{ ...styles.formLabel, fontWeight: 700, color: '#1D4ED8' }}>🔍 Fetch Receiver from CRM (by Mobile)</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input
                type="tel"
                value={crmMobile}
                onChange={e => setCrmMobile(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchCrmForCourier(); } }}
                maxLength={15}
                placeholder="Customer's mobile number"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" disabled={crmSearching}
                style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline, opacity: crmSearching ? 0.7 : 1 }}
                onClick={searchCrmForCourier}>
                {crmSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {crmMessage && (
              <div style={{ marginTop: 6, fontSize: 12, color: crmMessage.type === 'error' ? colors.danger : crmMessage.type === 'success' ? '#15803d' : colors.textMuted, fontWeight: crmMessage.type === 'success' ? 600 : 400 }}>
                {crmMessage.text}
              </div>
            )}
            {crmResults.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Found {crmResults.length} call(s) — pick the right one:</div>
                {crmResults.map(t => (
                  <div key={t.id} onClick={() => selectCrmReceiver(t.id)}
                    style={{ cursor: 'pointer', background: '#fff', border: '1px solid #BFDBFE', borderRadius: 8, padding: '8px 10px', marginBottom: 5 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1D4ED8' }}>{t.id} — {t.cname || ''}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{t.model || ''}{t.problem ? ` · ${t.problem}` : ''} · {t.city || ''} · {t.status || ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ gridColumn: '1 / -1' }} ref={wrapRef}>
            <label style={styles.formLabel}>Receiver * <span style={{ fontSize: 11, color: colors.textMuted }}>(Select from Master, or fetch from CRM above)</span></label>
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
                    <div key={r.id} onClick={() => { setSelectedReceiver(r); setSelectedCrmTicketId(null); setSearch(r.name); setDdOpen(false); }}
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
                <b>{selectedReceiver.name}</b>{selectedCrmTicketId && <span style={{ color: '#64748B', fontWeight: 400 }}> (from {selectedCrmTicketId})</span>}<br />
                {selectedReceiver.address && <>{selectedReceiver.address}<br /></>}
                {selectedReceiver.area && <>{selectedReceiver.area}, </>}
                {selectedReceiver.city}{selectedReceiver.pin ? `, ${selectedReceiver.pin}` : ''}{selectedReceiver.state ? `, ${selectedReceiver.state}` : ''}
                {selectedReceiver.phone && <><br />📞 {selectedReceiver.phone}</>}
              </div>
            )}
          </div>
          <div>
            <label style={styles.formLabel}>Weight (kg)</label>
            <input type="number" name="weight" value={form.weight} onChange={handleChange} step="0.1" min="0" style={inputStyle} placeholder="e.g. 1.5" />
          </div>
          <div>
            <label style={styles.formLabel}>Entry Date <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 400 }}>(backdate if entering the next day's dispatch)</span></label>
            <input type="date" name="entry_date" value={form.entry_date} onChange={handleChange} max={getToday()} style={inputStyle} />
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