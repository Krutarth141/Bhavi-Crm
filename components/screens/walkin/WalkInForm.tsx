'use client';

import { useState, useEffect } from 'react';
import { WalkInEntry, WalkInProduct } from '@/types/walkin';
import { colors, styles } from '@/styles/ticketsStyles';

interface WalkInFormProps {
  entry: WalkInEntry | null;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  nextToken: number;
}

const emptyProduct = (): WalkInProduct => ({
  type: 'Inward',
  brand: '',
  model: '',
  serial: '',
  problem: '',
});

function getCurrentTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function WalkInForm({ entry, onSave, onClose, nextToken }: WalkInFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [arrivalTime, setArrivalTime] = useState(getCurrentTime());
  const [products, setProducts] = useState<WalkInProduct[]>([emptyProduct()]);
  const [errors, setErrors] = useState<{ customerName?: string; mobile?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setCustomerName(entry.customer_name);
      setMobile(entry.mobile);
      setArrivalTime(entry.arrival_time?.slice(0, 5) || getCurrentTime());
      setProducts(entry.products?.length ? entry.products : [emptyProduct()]);
    } else {
      setCustomerName('');
      setMobile('');
      setArrivalTime(getCurrentTime());
      setProducts([emptyProduct()]);
    }
    setErrors({});
  }, [entry]);

  const handleProductChange = (index: number, field: keyof WalkInProduct, value: string) => {
    setProducts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addProduct = () => setProducts((prev) => [...prev, emptyProduct()]);

  const removeProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

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
      await onSave({
        customer_name: customerName.trim(),
        mobile: mobile.trim(),
        arrival_time: arrivalTime,
        token_no: entry ? entry.token_no : nextToken,
        products,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: '740px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{entry ? '✏️ Edit Walk-in' : '➕ New Walk-in'}</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Customer Section */}
          <div style={styles.sectionDivider}>
            <h3 style={styles.sectionHeader2}>👤 Customer Details</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Customer Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ ...styles.formInput, borderColor: errors.customerName ? colors.danger : undefined }}
                  placeholder="Enter customer name"
                />
                {errors.customerName && (
                  <span style={{ color: colors.danger, fontSize: '11px' }}>{errors.customerName}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Mobile *</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  style={{ ...styles.formInput, borderColor: errors.mobile ? colors.danger : undefined }}
                  placeholder="Enter mobile number"
                />
                {errors.mobile && (
                  <span style={{ color: colors.danger, fontSize: '11px' }}>{errors.mobile}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Arrival Time</label>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Token Number</label>
                <input
                  type="number"
                  value={entry ? entry.token_no : nextToken}
                  readOnly
                  style={{ ...styles.formInput, opacity: 0.6, backgroundColor: colors.bg }}
                />
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div style={styles.sectionDivider}>
            <h3 style={styles.sectionHeader2}>📦 Products</h3>

            {products.map((product, index) => (
              <div
                key={index}
                style={{
                  background: colors.bg,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '10px',
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: colors.textMuted }}>
                    Product {index + 1}
                  </span>
                  {products.length > 1 && (
                    <button
                      onClick={() => removeProduct(index)}
                      style={{
                        background: '#fee2e2',
                        color: colors.danger,
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      ➖ Remove
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '10px',
                  }}
                >
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Type</label>
                    <select
                      value={product.type}
                      onChange={(e) => handleProductChange(index, 'type', e.target.value)}
                      style={styles.formInput}
                    >
                      <option value="Inward">Inward</option>
                      <option value="Outward">Outward</option>
                      <option value="For Checking Only">For Checking Only</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Brand</label>
                    <input
                      type="text"
                      value={product.brand}
                      onChange={(e) => handleProductChange(index, 'brand', e.target.value)}
                      style={styles.formInput}
                      placeholder="Brand"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Model</label>
                    <input
                      type="text"
                      value={product.model}
                      onChange={(e) => handleProductChange(index, 'model', e.target.value)}
                      style={styles.formInput}
                      placeholder="Model"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Serial</label>
                    <input
                      type="text"
                      value={product.serial}
                      onChange={(e) => handleProductChange(index, 'serial', e.target.value)}
                      style={styles.formInput}
                      placeholder="Serial number"
                    />
                  </div>

                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.formLabel}>Problem</label>
                    <input
                      type="text"
                      value={product.problem}
                      onChange={(e) => handleProductChange(index, 'problem', e.target.value)}
                      style={styles.formInput}
                      placeholder="Describe the problem"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addProduct}
              style={{
                ...styles.btn,
                ...styles.btnOutline,
                fontSize: '13px',
                marginTop: '4px',
              }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)}
            >
              ➕ Add Product
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.modalFooter}>
          <button
            style={{ ...styles.btn, ...styles.btnOutline }}
            onClick={onClose}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)}
          >
            Cancel
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: saving ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={saving}
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
