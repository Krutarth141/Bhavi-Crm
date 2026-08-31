'use client';
import { useState } from 'react';
import { EngStock } from '@/types/engParts';
import { InventoryItem } from '@/types/inventory';
import { colors, styles } from '@/styles/ticketsStyles';

interface Props {
  mode: 'return' | 'warranty';
  engineers: string[];
  engStock: EngStock[];
  inventory: InventoryItem[];
  onSave: (params: { part_id: string; eng_name?: string; qty: number; job_sheet?: string; note?: string }) => Promise<void>;
  onClose: () => void;
}

export default function ReturnModal({ mode, engineers, engStock, inventory, onSave, onClose }: Props) {
  const isWarranty = mode === 'warranty';
  const [engineer, setEngineer] = useState('');
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState(1);
  const [jobSheet, setJobSheet] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const title = isWarranty ? '🔄 Warranty Return' : '↩️ Engineer Return';

  // Engineer Return: parts held by the selected engineer's bag only.
  // Warranty Return: the part is coming back from Canon to office stock —
  // it has nothing to do with any engineer's bag, so the full inventory list
  // is offered (index.html:24624-24645, modal-eng-warranty has no engineer
  // field at all).
  const engineerStock = engStock.filter(s => s.owner === engineer);
  const availableParts = isWarranty
    ? inventory
    : inventory.filter(item => engineerStock.some(s => s.part_id === item.id));

  const selectedEngStock = engineerStock.find(s => s.part_id === partId);

  const errors = {
    engineer: submitted && !isWarranty && !engineer ? 'Engineer is required' : '',
    part: submitted && !partId ? 'Part is required' : '',
    qty: submitted && qty < 1 ? 'Quantity must be at least 1' : '',
    jobSheet: submitted && isWarranty && !jobSheet.trim() ? 'SE Call ID is required to match the warranty return.' : '',
  };

  const isValid = isWarranty
    ? !!partId && qty >= 1 && !!jobSheet.trim()
    : !!engineer && !!partId && qty >= 1;

  const handleEngineerChange = (eng: string) => {
    setEngineer(eng);
    setPartId('');
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave(
        isWarranty
          ? { part_id: partId, qty, job_sheet: jobSheet.trim(), note: note || undefined }
          : { part_id: partId, eng_name: engineer, qty, note: note || undefined }
      );
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
          <span style={styles.modalTitle}>{title}</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={styles.modalBody}>
          {isWarranty && (
            <p style={{ fontSize: 12, color: colors.success, background: '#f0fdf4', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
              Part received back from company — will be added to Office stock.
            </p>
          )}
          <div style={styles.formGrid}>
            {/* Engineer — Engineer Return only */}
            {!isWarranty && (
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Engineer *</label>
                <select
                  style={{
                    ...styles.formInput,
                    borderColor: errors.engineer ? colors.danger : colors.border,
                  }}
                  value={engineer}
                  onChange={e => handleEngineerChange(e.target.value)}
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
            )}

            {/* Part — Engineer Return: filtered to engineer's stock. Warranty Return: full inventory. */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Part *</label>
              <select
                style={{
                  ...styles.formInput,
                  borderColor: errors.part ? colors.danger : colors.border,
                }}
                value={partId}
                onChange={e => setPartId(e.target.value)}
                disabled={!isWarranty && !engineer}
              >
                <option value="">— Select Part —</option>
                {availableParts.map(item => (
                  <option key={item.id} value={item.id}>{item.item_name}</option>
                ))}
              </select>
              {errors.part && (
                <span style={{ fontSize: '11px', color: colors.danger }}>{errors.part}</span>
              )}
              {!isWarranty && selectedEngStock && (
                <span style={{ fontSize: '11px', color: colors.textMuted }}>
                  With engineer: {selectedEngStock.qty}
                </span>
              )}
              {!isWarranty && engineer && availableParts.length === 0 && (
                <span style={{ fontSize: '11px', color: colors.textMuted }}>
                  No parts assigned to this engineer
                </span>
              )}
            </div>

            {/* Qty */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>{isWarranty ? 'Quantity Received *' : 'Quantity *'}</label>
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

            {/* SE Call ID — Warranty Return only */}
            {isWarranty && (
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>SE Call ID *</label>
                <input
                  type="text"
                  style={{
                    ...styles.formInput,
                    borderColor: errors.jobSheet ? colors.danger : colors.border,
                  }}
                  value={jobSheet}
                  onChange={e => setJobSheet(e.target.value)}
                  placeholder="e.g. BH-2025-001"
                />
                {errors.jobSheet && (
                  <span style={{ fontSize: '11px', color: colors.danger }}>{errors.jobSheet}</span>
                )}
              </div>
            )}

            {/* Note */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>{isWarranty ? 'Notes' : 'Note (optional)'}</label>
              <input
                type="text"
                style={styles.formInput}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
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
            {isWarranty ? 'Add to Stock' : title}
          </button>
        </div>
      </div>
    </div>
  );
}