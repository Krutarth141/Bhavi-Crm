'use client';
import { useState } from 'react';
import { InventoryItem } from '@/types/inventory';
import { colors, styles } from '@/styles/ticketsStyles';

interface Props {
  inventory: InventoryItem[];
  onSave: (params: {
    date: string; partId: string; partCode: string; partName: string; availStock: number;
    qty: number; price: number; customer: string; invoiceNo: string;
  }) => Promise<void>;
  onClose: () => void;
}

const todayStr = () => new Date().toLocaleDateString('en-CA');

// Mirrors HTML's openEngRecordSale/saveEngRecordSale (index.html:13451-13517).
export default function RecordSaleModal({ inventory, onSave, onClose }: Props) {
  const [date, setDate] = useState(todayStr());
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [customer, setCustomer] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const availableParts = inventory.filter(i => (i.qty_in_stock || 0) > 0);
  const selectedPart = inventory.find(i => i.id === partId);

  const handlePartChange = (id: string) => {
    setPartId(id);
    const item = inventory.find(i => i.id === id);
    setPrice(item?.unit_price || 0);
  };

  const errors = {
    part: submitted && !partId ? 'Part is required' : '',
    qty: submitted && qty < 1 ? 'Quantity must be at least 1' : (submitted && selectedPart && qty > (selectedPart.qty_in_stock || 0) ? `Only ${selectedPart.qty_in_stock || 0} in stock` : ''),
    price: submitted && price <= 0 ? 'Unit price is required' : '',
    customer: submitted && !customer.trim() ? 'Customer Name is required' : '',
    invoiceNo: submitted && !invoiceNo.trim() ? 'Invoice / Bill No is required' : '',
  };

  const isValid = !!partId && qty >= 1 && price > 0 && !!customer.trim() && !!invoiceNo.trim()
    && !!selectedPart && qty <= (selectedPart.qty_in_stock || 0);

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!isValid || !selectedPart) return;
    setSaving(true);
    try {
      await onSave({
        date, partId, partCode: selectedPart.part_code ?? selectedPart.item_code ?? '',
        partName: selectedPart.item_name, availStock: selectedPart.qty_in_stock || 0,
        qty, price, customer: customer.trim(), invoiceNo: invoiceNo.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>🛒 Record Sale</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Date</label>
              <input type="date" style={styles.formInput} value={date} onChange={e => setDate(e.target.value)} />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Part *</label>
              <select
                style={{ ...styles.formInput, borderColor: errors.part ? colors.danger : colors.border }}
                value={partId}
                onChange={e => handlePartChange(e.target.value)}
              >
                <option value="">— Select Part —</option>
                {availableParts.map(item => (
                  <option key={item.id} value={item.id}>{item.part_code ?? item.item_code} — {item.item_name}</option>
                ))}
              </select>
              {errors.part && <span style={{ fontSize: '11px', color: colors.danger }}>{errors.part}</span>}
              {selectedPart && (
                <span style={{ fontSize: '11px', color: colors.textMuted }}>Available Stock: {selectedPart.qty_in_stock}</span>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Quantity *</label>
              <input
                type="number"
                min={1}
                style={{ ...styles.formInput, borderColor: errors.qty ? colors.danger : colors.border }}
                value={qty}
                onChange={e => setQty(Number(e.target.value))}
              />
              {errors.qty && <span style={{ fontSize: '11px', color: colors.danger }}>{errors.qty}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Unit Price ₹ *</label>
              <input
                type="number"
                min={0}
                style={{ ...styles.formInput, borderColor: errors.price ? colors.danger : colors.border }}
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
              />
              {errors.price && <span style={{ fontSize: '11px', color: colors.danger }}>{errors.price}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Customer Name *</label>
              <input
                type="text"
                style={{ ...styles.formInput, borderColor: errors.customer ? colors.danger : colors.border }}
                value={customer}
                onChange={e => setCustomer(e.target.value)}
              />
              {errors.customer && <span style={{ fontSize: '11px', color: colors.danger }}>{errors.customer}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Invoice / Bill No *</label>
              <input
                type="text"
                placeholder="e.g. 1740/26-27"
                style={{ ...styles.formInput, borderColor: errors.invoiceNo ? colors.danger : colors.border }}
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
              />
              {errors.invoiceNo && <span style={{ fontSize: '11px', color: colors.danger }}>{errors.invoiceNo}</span>}
            </div>
          </div>

          <div style={{ background: colors.bg, borderRadius: 8, padding: 10, fontSize: 13, marginTop: 8 }}>
            Total: <b>₹{(qty * price).toFixed(0)}</b>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}
