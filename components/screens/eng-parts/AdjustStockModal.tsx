'use client';
import { useState } from 'react';
import { colors, styles } from '@/styles/ticketsStyles';

interface Props {
    ownerLabel: string;
    partLabel: string;
    currentQty: number;
    onSave: (newQty: number, remark: string) => Promise<void>;
    onClose: () => void;
}

// Mirrors HTML's openEngAdj/saveEngAdj (index.html:11136-11177) — admin-only
// stock correction, either "Set to" an exact value or Add/Subtract a delta,
// with a mandatory remark logged as an ADJUST movement.
export default function AdjustStockModal({ ownerLabel, partLabel, currentQty, onSave, onClose }: Props) {
    const [setVal, setSetVal] = useState('');
    const [addVal, setAddVal] = useState('');
    const [subVal, setSubVal] = useState('');
    const [remark, setRemark] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [saving, setSaving] = useState(false);

    const newQty = setVal !== ''
        ? Math.max(0, parseInt(setVal, 10) || 0)
        : Math.max(0, currentQty + (parseInt(addVal, 10) || 0) - (parseInt(subVal, 10) || 0));

    const remarkError = submitted && !remark.trim() ? 'Remark is mandatory for a stock correction — explain why.' : '';

    const handleSubmit = async () => {
        setSubmitted(true);
        if (!remark.trim()) return;
        if (newQty === currentQty) { alert('No change.'); return; }
        setSaving(true);
        try {
            await onSave(newQty, remark.trim());
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modal}>
                <div style={styles.modalHeader}>
                    <span style={styles.modalTitle}>🛠️ Stock Correction</span>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div style={styles.modalBody}>
                    <p style={{ fontSize: 12, color: colors.textMuted, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                        {ownerLabel} · {partLabel} · Current: {currentQty}
                    </p>
                    <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Set To (exact qty)</label>
                            <input
                                type="number" min={0} style={styles.formInput}
                                value={setVal}
                                onChange={e => setSetVal(e.target.value)}
                                placeholder="Leave blank to use Add/Subtract instead"
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Add</label>
                            <input type="number" min={0} style={styles.formInput} value={addVal} onChange={e => setAddVal(e.target.value)} disabled={setVal !== ''} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Subtract</label>
                            <input type="number" min={0} style={styles.formInput} value={subVal} onChange={e => setSubVal(e.target.value)} disabled={setVal !== ''} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Remark *</label>
                            <input
                                type="text"
                                style={{ ...styles.formInput, borderColor: remarkError ? colors.danger : colors.border }}
                                value={remark}
                                onChange={e => setRemark(e.target.value)}
                                placeholder="Why is this being corrected?"
                            />
                            {remarkError && <span style={{ fontSize: 11, color: colors.danger }}>{remarkError}</span>}
                        </div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: colors.text }}>
                        New quantity: {newQty} {newQty !== currentQty ? `(${newQty > currentQty ? '+' : ''}${newQty - currentQty})` : '(no change)'}
                    </div>
                </div>
                <div style={styles.modalFooter}>
                    <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={onClose} disabled={saving}>Cancel</button>
                    <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Saving...' : '💾 Save Correction'}
                    </button>
                </div>
            </div>
        </div>
    );
}