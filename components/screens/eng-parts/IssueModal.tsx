'use client';
import { useState } from 'react';
import { InventoryItem } from '@/types/inventory';
import { colors, styles } from '@/styles/ticketsStyles';

interface Props {
  engineers: string[];
  inventory: InventoryItem[];
  onSave: (params: { part_id: string; eng_name: string; qty: number; ticket_id?: string; note?: string }) => Promise<void>;
  onClose: () => void;
}

export default function IssueModal({ engineers, inventory, onSave, onClose }: Props) {
  const [engineer, setEngineer] = useState('');
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState(1);
  const [ticketId, setTicketId] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedPart = inventory.find(i => i.id === partId);

  const errors = {
    engineer: submitted && !engineer ? 'Engineer is required' : '',
    part: submitted && !partId ? 'Part is required' : '',
    qty: submitted && qty < 1 ? 'Quantity must be at least 1' : '',
  };

  const isValid = engineer && partId && qty >= 1;

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave({
        part_id: partId,
        eng_name: engineer,
        qty,
        ticket_id: ticketId || undefined,
        note: note || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>📤 Issue to Engineer</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={styles.modalBody}>
          <div style={styles.formGrid}>
            {/* Engineer */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Engineer *</label>
              <select
                style={{
                  ...styles.formInput,
                  borderColor: errors.engineer ? colors.danger : colors.border,
                }}
                value={engineer}
                onChange={e => setEngineer(e.target.value)}
              >
                <option value="">— Select Engineer —</option>
                {engineers.map(eng => (
                  <option key={eng} value={eng}>{eng}</option>
                ))}
              </select>
              {errors.engineer && (
                <span style={{ fontSize: '11px', color: colors.danger }}>{errors.engineer}</span>
              )}
            </div>

            {/* Part */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Part *</label>
              <select
                style={{
                  ...styles.formInput,
                  borderColor: errors.part ? colors.danger : colors.border,
                }}
                value={partId}
                onChange={e => setPartId(e.target.value)}
              >
                <option value="">— Select Part —</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>{item.item_name}</option>
                ))}
              </select>
              {errors.part && (
                <span style={{ fontSize: '11px', color: colors.danger }}>{errors.part}</span>
              )}
              {selectedPart && (
                <span style={{ fontSize: '11px', color: colors.textMuted }}>
                  Available: {selectedPart.qty_in_stock}
                </span>
              )}
            </div>

            {/* Qty */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Quantity *</label>
              <input
                type="number"
                min={1}
                style={{
                  ...styles.formInput,
                  borderColor: errors.qty ? colors.danger : colors.border,
                }}
                value={qty}
                onChange={e => setQty(Number(e.target.value))}
              />
              {errors.qty && (
                <span style={{ fontSize: '11px', color: colors.danger }}>{errors.qty}</span>
              )}
            </div>

            {/* Ticket ID */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Ticket ID (optional)</label>
              <input
                type="text"
                style={styles.formInput}
                value={ticketId}
                onChange={e => setTicketId(e.target.value)}
                placeholder="e.g. TKT-001"
              />
            </div>
          </div>

          {/* Note */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Note (optional)</label>
            <input
              type="text"
              style={styles.formInput}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div style={styles.modalFooter}>
          <button
            style={{ ...styles.btn, ...styles.btnOutline }}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={handleSubmit}
            disabled={saving}
          >
            📤 Issue
          </button>
        </div>
      </div>
    </div>
  );
}
