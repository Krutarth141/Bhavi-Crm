'use client';
import { useState } from 'react';
import { EngStock } from '@/types/engParts';
import { InventoryItem } from '@/types/inventory';
import { colors, styles } from '@/styles/ticketsStyles';

interface Props {
    mode: 'receive' | 'return';
    inventory: InventoryItem[];
    myStock: EngStock[];
    onSave: (params: { part_id: string; part_name: string; qty: number; note?: string }) => Promise<void>;
    onClose: () => void;
}

// Mirrors HTML's modal-eng-req-receive / modal-eng-req-return
// (openEngReqReceive/openEngReqReturn, index.html:13624,13687) — used by
// both plain engineers (EngPartsEngineer.tsx) and CSP Managers from the full
// admin-equivalent page. Simplified to one part per submission, same
// convention as every other eng-parts modal in this port (IssueModal,
// ReturnModal, etc.) rather than HTML's multi-row cart.
export default function SelfRequestModal({ mode, inventory, myStock, onSave, onClose }: Props) {
    const isReturn = mode === 'return';
    const [partId, setPartId] = useState('');
    const [qty, setQty] = useState(1);
    const [note, setNote] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [saving, setSaving] = useState(false);

    const availableParts = isReturn
        ? inventory.filter(item => myStock.some(s => s.part_id === item.id && s.qty > 0))
        : inventory;

    const myStockForPart = myStock.find(s => s.part_id === partId);
    const selectedPart = inventory.find(i => i.id === partId);

    const errors = {
        part: submitted && !partId ? 'Part is required' : '',
        qty: submitted && qty < 1
            ? 'Quantity must be at least 1'
            : (submitted && isReturn && myStockForPart && qty > myStockForPart.qty ? `Only ${myStockForPart.qty} in hand` : ''),
    };

    const isValid = !!partId && qty >= 1 && (!isReturn || (!!myStockForPart && qty <= myStockForPart.qty));

    const handleSubmit = async () => {
        setSubmitted(true);
        if (!isValid || !selectedPart) return;
        setSaving(true);
        try {
            await onSave({ part_id: partId, part_name: selectedPart.item_name, qty, note: note || undefined });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" style={styles.modalOverlay}>
            <div className="modal" style={styles.modal}>
                <div style={styles.modalHeader}>
                    <span style={styles.modalTitle}>{isReturn ? '↩️ Return My Parts' : '📥 Request Parts (Self)'}</span>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div style={styles.modalBody}>
                    <div className="form-grid" style={styles.formGrid}>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Part *</label>
                            <select
                                style={{ ...styles.formInput, borderColor: errors.part ? colors.danger : colors.border }}
                                value={partId}
                                onChange={e => setPartId(e.target.value)}
                            >
                                <option value="">— Select Part —</option>
                                {availableParts.map(item => (
                                    <option key={item.id} value={item.id}>{item.part_code ?? item.item_code} — {item.item_name}</option>
                                ))}
                            </select>
                            {errors.part && <span style={{ fontSize: '11px', color: colors.danger }}>{errors.part}</span>}
                            {isReturn && myStockForPart && (
                                <span style={{ fontSize: '11px', color: colors.textMuted }}>In hand: {myStockForPart.qty}</span>
                            )}
                            {isReturn && availableParts.length === 0 && (
                                <span style={{ fontSize: '11px', color: colors.textMuted }}>You have no parts in stock to return</span>
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
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Note (optional)</label>
                        <input
                            type="text"
                            style={styles.formInput}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Reason..."
                        />
                    </div>
                </div>

                <div style={styles.modalFooter}>
                    <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Submitting...' : (isReturn ? 'Submit Return' : 'Submit Request')}
                    </button>
                </div>
            </div>
        </div>
    );
}