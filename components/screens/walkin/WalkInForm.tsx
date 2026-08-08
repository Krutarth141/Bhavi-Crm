'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { WalkInEntry, WalkInProduct, emptyWalkInProduct } from '@/types/walkin';
import { fetchWalkInCustomer, searchPincodes, PincodeMatch } from '@/services/walkInService';
import WalkInProductRow from './WalkInProductRow';
import { colors, styles } from '@/styles/ticketsStyles';

interface WalkInFormProps {
  entry: WalkInEntry | null;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  nextToken: number;
}

const STATE_OPTIONS = ['Gujarat', 'Rajasthan', 'Maharashtra'];

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function WalkInForm({ entry, onSave, onClose, nextToken }: WalkInFormProps) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.roleType === 'admin';

  const [mobile, setMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [arrivalTime, setArrivalTime] = useState(getCurrentTime());
  const [departureTime, setDepartureTime] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [city, setCity] = useState('');
  const [pin, setPin] = useState('');
  const [area, setArea] = useState('');
  const [route, setRoute] = useState<'ICP' | 'CSP' | 'self'>('self');
  const [products, setProducts] = useState<WalkInProduct[]>([emptyWalkInProduct()]);
  const [errors, setErrors] = useState<{ customerName?: string; mobile?: string }>({});
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [models, setModels] = useState<{ id: string; brand_id: string | null; model_no: string; model_name: string | null }[]>([]);

  const [pinResults, setPinResults] = useState<PincodeMatch[]>([]);
  const [pinDdOpen, setPinDdOpen] = useState(false);
  const pinWrapRef = useRef<HTMLDivElement>(null);
  const pinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.from('brands').select('id,name').order('name').then(({ data }) => setBrands(data || []));
    supabase.from('models').select('id,brand_id,model_no,model_name').order('model_no').limit(1000).then(({ data }) => setModels(data || []));
  }, []);

  useEffect(() => {
    if (entry) {
      setMobile(entry.mobile);
      setCustomerName(entry.customer_name);
      setArrivalTime(entry.arrival_time?.slice(0, 5) || getCurrentTime());
      setDepartureTime(entry.departure_time?.slice(0, 5) || '');
      setAddressLine1(entry.address || '');
      setAddressLine2('');
      setStateVal(entry.state || '');
      setCity(entry.city || '');
      setPin(entry.pin || '');
      setArea(entry.area || '');
      setProducts(entry.products?.length ? entry.products : [emptyWalkInProduct()]);
    } else {
      setMobile(''); setCustomerName(''); setArrivalTime(getCurrentTime()); setDepartureTime('');
      setAddressLine1(''); setAddressLine2(''); setStateVal(''); setCity(''); setPin(''); setArea('');
      setProducts([emptyWalkInProduct()]);
    }
    setErrors({});
  }, [entry]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (pinWrapRef.current && !pinWrapRef.current.contains(e.target as Node)) setPinDdOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const handleFetchCustomer = async () => {
    if (mobile.length !== 10) { alert('Please enter a valid 10-digit mobile number.'); return; }
    setFetching(true);
    try {
      const match = await fetchWalkInCustomer(mobile);
      if (match) {
        setCustomerName(match.name);
        if (!addressLine1) setAddressLine1(match.address || '');
        if (match.area) setArea(match.area);
        if (match.pin) setPin(match.pin);
        if (match.state) setStateVal(match.state);
        if (match.city) setCity(match.city);
      }
    } finally {
      setFetching(false);
    }
  };

  const handlePinInput = (val: string) => {
    setPin(val);
    if (pinTimer.current) clearTimeout(pinTimer.current);
    const q = val.trim();
    if (!q) { setPinResults([]); setPinDdOpen(false); return; }
    pinTimer.current = setTimeout(async () => {
      const rows = await searchPincodes(q, stateVal);
      setPinResults(rows);
      setPinDdOpen(rows.length > 0);
    }, 200);
  };

  const selectPin = (row: PincodeMatch) => {
    setPin(row.pincode);
    if (row.area) setArea(row.area);
    setPinDdOpen(false);
  };

  const addProduct = () => setProducts((prev) => [...prev, emptyWalkInProduct()]);
  const removeProduct = (index: number) => setProducts((prev) => prev.filter((_, i) => i !== index));

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!mobile.trim()) newErrors.mobile = 'Mobile number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const address = addressLine1.trim() + (addressLine2.trim() ? `, ${addressLine2.trim()}` : '');
      await onSave({
        customer_name: customerName.trim(),
        mobile: mobile.trim(),
        arrival_time: arrivalTime,
        departure_time: departureTime || null,
        address: address || null,
        state: stateVal || null,
        city: city || null,
        pin: pin || null,
        area: area || null,
        token_no: entry ? entry.token_no : nextToken,
        products,
        product_count: products.length,
        route: isAdmin ? route : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: '740px' }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{entry ? '✏️ Edit Walk-in' : '➕ New Walk-in'}</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '20px' }}>
          {isAdmin && !entry && (
            <div style={{ ...styles.formGroup, marginBottom: 14 }}>
              <label style={styles.formLabel}>Route To Work Center</label>
              <select value={route} onChange={(e) => setRoute(e.target.value as any)} style={{ ...styles.formInput, maxWidth: 320 }}>
                <option value="ICP">📷 ICP — Camera Service</option>
                <option value="CSP">🖨️ CSP — Printer / Fujifilm Service</option>
                <option value="self">🧑 My Queue (Admin)</option>
              </select>
            </div>
          )}

          <div style={styles.sectionDivider}>
            <h3 style={styles.sectionHeader2}>👤 Customer Details</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Mobile No *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="tel" maxLength={10} value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    style={{ ...styles.formInput, flex: 1, borderColor: errors.mobile ? colors.danger : undefined }}
                    placeholder="10 digit mobile"
                  />
                  <button type="button" onClick={handleFetchCustomer} disabled={fetching} style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSm, flexShrink: 0 }}>
                    {fetching ? '⏳' : '🔍 Fetch'}
                  </button>
                </div>
                {errors.mobile && <span style={{ color: colors.danger, fontSize: '11px' }}>{errors.mobile}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Customer Name *</label>
                <input
                  type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  style={{ ...styles.formInput, borderColor: errors.customerName ? colors.danger : undefined }}
                  placeholder="Enter customer name"
                />
                {errors.customerName && <span style={{ color: colors.danger, fontSize: '11px' }}>{errors.customerName}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Arrival Time *</label>
                <input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} style={styles.formInput} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Departure Time</label>
                <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} style={styles.formInput} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Token Number</label>
                <input type="number" value={entry ? entry.token_no : nextToken} readOnly style={{ ...styles.formInput, opacity: 0.6, backgroundColor: colors.bg }} />
              </div>
            </div>
          </div>

          <div style={styles.sectionDivider}>
            <h3 style={styles.sectionHeader2}>📍 Address <span style={{ fontWeight: 400, fontSize: 12, color: colors.textMuted }}>(optional — auto-filled if customer exists)</span></h3>
            <div style={styles.formGrid}>
              <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                <label style={styles.formLabel}>Address Line 1</label>
                <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} style={styles.formInput} placeholder="House No, Street, Building..." />
              </div>
              <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                <label style={styles.formLabel}>Address Line 2</label>
                <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} style={styles.formInput} placeholder="Society, Landmark, Colony..." />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>State</label>
                <select value={stateVal} onChange={(e) => setStateVal(e.target.value)} style={styles.formInput}>
                  <option value="">-- Select State --</option>
                  {STATE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} style={styles.formInput} placeholder="City / District" />
              </div>
              <div style={styles.formGroup} ref={pinWrapRef}>
                <label style={styles.formLabel}>Pin Code</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text" value={pin} autoComplete="off"
                    onChange={(e) => handlePinInput(e.target.value)}
                    onFocus={() => setPinDdOpen(pinResults.length > 0)}
                    style={styles.formInput} placeholder="Type area name or pin code..."
                  />
                  {pinDdOpen && pinResults.length > 0 && (
                    <div style={{ position: 'absolute', zIndex: 500, top: '100%', left: 0, right: 0, maxHeight: 200, overflowY: 'auto', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)', marginTop: 2 }}>
                      {pinResults.map((r) => (
                        <div key={r.pincode} onClick={() => selectPin(r)} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: colors.primary }}>{r.area ? `${r.area} - ` : ''}{r.pincode}</span>
                          {r.district && <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.district}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Area</label>
                <input type="text" value={area} readOnly style={{ ...styles.formInput, background: colors.bg, color: colors.textMuted, cursor: 'not-allowed' }} placeholder="Auto-filled from Pin Code" />
              </div>
            </div>
          </div>

          <div style={styles.sectionDivider}>
            <h3 style={styles.sectionHeader2}>📦 Products</h3>
            {products.map((product, index) => (
              <WalkInProductRow
                key={index}
                index={index}
                product={product}
                brands={brands}
                models={models}
                onChange={(np) => setProducts((prev) => prev.map((x, i) => i === index ? np : x))}
                onRemove={products.length > 1 ? () => removeProduct(index) : undefined}
              />
            ))}
            <button
              onClick={addProduct}
              style={{ ...styles.btn, ...styles.btnOutline, fontSize: '13px', marginTop: '4px' }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)}
            >
              ➕ Add Product
            </button>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button
            style={{ ...styles.btn, ...styles.btnOutline }} onClick={onClose}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)}
          >
            Cancel
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: saving ? 0.7 : 1 }}
            onClick={handleSubmit} disabled={saving}
            onMouseEnter={(e) => !saving && Object.assign(e.currentTarget.style, styles.btnPrimaryHover)}
            onMouseLeave={(e) => !saving && Object.assign(e.currentTarget.style, styles.btnPrimary)}
          >
            {saving ? '⏳ Saving...' : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  );
}