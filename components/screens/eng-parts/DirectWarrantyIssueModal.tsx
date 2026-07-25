'use client';
import { useState } from 'react';
import { InventoryItem } from '@/types/inventory';
import { colors, styles } from '@/styles/ticketsStyles';
import { checkDirectWarrantyDuplicate } from '@/services/engPartsService';

interface Props {
    engineers: string[];
    inventory: InventoryItem[];
    onSave: (params: { part_id: string; eng_name: string; qty: number; job_sheet: string; note?: string }) => Promise<void>;
    onClose: () => void;
}

export default function DirectWarrantyIssueModal({ engineers, inventory, onSave, onClose }: Props) {
    const [engineer, setEngineer] = useState('');
    const [partId, setPartId] = useState('');
    const [qty, setQty] = useState(1);
    const [jobSheet, setJobSheet] = useState('');
    const [note, setNote] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [saving, setSaving] = useState(false);

    const errors = {
        engineer: submitted && !engineer ? 'Engineer is required' : '',
        part: submitted && !partId ? 'Part is required' : '',
        qty: submitted && qty < 1 ? 'Quantity must be at least 1' : '',
        jobSheet: submitted && !jobSheet.trim() ? 'SE Call ID is required for warranty tracking' : '',
    };

    const isValid = engineer && partId && qty >= 1 && jobSheet.trim();

    const handleSubmit = async () => {
        setSubmitted(true);
        if (!isValid) return;
        setSaving(true);
        try {
            const isDup = await checkDirectWarrantyDuplicate(jobSheet, partId);
            if (isDup && !confirm('A warranty entry already exists for this SE Call ID + Part. Add another entry?')) {
                setSaving(false);
                return;
            }
            await onSave({ part_id: partId, eng_name: engineer, qty, job_sheet: jobSheet, note: note || undefined });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modal}>
                <div style={styles.modalHeader}>
                    <span style={styles.modalTitle}>🎁 Direct Warranty Issue</span>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div style={styles.modalBody}>
                    <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Engineer *</label>
                            <select
                                style={{ ...styles.formInput, borderColor: errors.engineer ? colors.danger : colors.border }}
                                value={engineer}
                                onChange={e => setEngineer(e.target.value)}
                            >
                                <option value="">— Select Engineer —</option>
                                {engineers.map(eng => (
                                    <option key={eng} value={eng}>{eng}</option>
                                ))}
                            </select>
                            {errors.engineer && <span style={{ fontSize: '11px', color: colors.danger }}>{errors.engineer}</span>}
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Part *</label>
                            <select
                                style={{ ...styles.formInput, borderColor: errors.part ? colors.danger : colors.border }}
                                value={partId}
                                onChange={e => setPartId(e.target.value)}
                            >
                                <option value="">— Select Part —</option>
                                {inventory.map(item => (
                                    <option key={item.id} value={item.id}>{item.part_code ? `${item.part_code} — ${item.item_name}` : item.item_name}</option>
                                ))}
                            </select>
                            {errors.part && <span style={{ fontSize: '11px', color: colors.danger }}>{errors.part}</span>}
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
                            <label style={styles.formLabel}>SE Call ID *</label>
                            <input
                                type="text"
                                style={{ ...styles.formInput, borderColor: errors.jobSheet ? colors.danger : colors.border }}
                                value={jobSheet}
                                onChange={e => setJobSheet(e.target.value)}
                                placeholder="e.g. SE/2026/00123"
                            />
                            {errors.jobSheet && <span style={{ fontSize: '11px', color: colors.danger }}>{errors.jobSheet}</span>}
                        </div>
                    </div>

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

                <div style={styles.modalFooter}>
                    <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={onClose} disabled={saving}>Cancel</button>
                    <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleSubmit} disabled={saving}>🎁 Issue</button>
                </div>
            </div>
        </div>
    );
}