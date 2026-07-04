'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { Engineer, EngineerFormData } from '@/hooks/useEngineers';

interface Props {
    isOpen: boolean;
    engineer: Engineer | null;
    onClose: () => void;
    onSave: (form: EngineerFormData, id?: string) => Promise<void>;
}

const emptyForm: EngineerFormData = {
    user_id: '', name: '', initials: '', password: '',
    eng_type: 'carryin', require_meter_photo: false, is_active: true,
};

const ENG_TYPES: { val: 'carryin' | 'onsite'; label: string }[] = [
    { val: 'carryin', label: '🏠 Carry In' },
    { val: 'onsite', label: '🚗 On Site' },
];

const fieldStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
    borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const,
};

const labelStyle = {
    display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '14px',
};

export default function EngineerFormModal({ isOpen, engineer, onClose, onSave }: Props) {
    const [form, setForm] = useState<EngineerFormData>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const isEdit = !!engineer;

    useEffect(() => {
        if (engineer) {
            setForm({
                user_id: engineer.user_id,
                name: engineer.name,
                initials: engineer.initials || '',
                password: '',
                eng_type: engineer.eng_type || 'carryin',
                require_meter_photo: engineer.require_meter_photo ?? false,
                is_active: engineer.is_active,
            });
        } else {
            setForm(emptyForm);
        }
        setError('');
    }, [engineer, isOpen]);

    const set = (key: keyof EngineerFormData, value: any) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Name is required'); return; }
        if (!form.user_id.trim()) { setError('Engineer ID is required'); return; }
        if (!isEdit && !form.password.trim()) { setError('Password is required'); return; }
        setSaving(true);
        setError('');
        try {
            await onSave(form, engineer?.id);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const footer = (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
                type="button"
                onClick={onClose}
                style={{
                    padding: '8px 16px', border: '1px solid var(--border)',
                    background: 'var(--bg-primary)', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '14px',
                }}
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                    padding: '8px 16px', background: 'var(--primary)', color: 'white',
                    border: 'none', borderRadius: '6px', fontSize: '14px',
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                }}
            >
                {saving ? 'Saving...' : isEdit ? '💾 Update' : '➕ Add Engineer'}
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? '✏️ Edit Engineer' : '➕ Add Engineer'}
            footer={footer}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {error && (
                    <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
                        {error}
                    </div>
                )}

                {/* Name + Initials */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={labelStyle}>Name *</label>
                        <input
                            type="text"
                            placeholder="Full name"
                            value={form.name}
                            onChange={e => set('name', e.target.value)}
                            style={fieldStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Initials</label>
                        <input
                            type="text"
                            placeholder="e.g. YS"
                            maxLength={3}
                            value={form.initials}
                            onChange={e => set('initials', e.target.value.toUpperCase())}
                            style={fieldStyle}
                        />
                    </div>
                </div>

                {/* Engineer ID + Password */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={labelStyle}>Engineer ID (Login) *</label>
                        <input
                            type="text"
                            placeholder="e.g. ENG001"
                            value={form.user_id}
                            onChange={e => set('user_id', e.target.value)}
                            disabled={isEdit}
                            style={{ ...fieldStyle, opacity: isEdit ? 0.6 : 1 }}
                        />
                        {isEdit && <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>ID cannot be changed</small>}
                    </div>
                    <div>
                        <label style={labelStyle}>{isEdit ? 'New Password (blank = no change)' : 'Password *'}</label>
                        <input
                            type="password"
                            placeholder={isEdit ? 'Leave blank to keep' : 'Set password'}
                            value={form.password}
                            onChange={e => set('password', e.target.value)}
                            style={fieldStyle}
                        />
                    </div>
                </div>

                {/* Engineer Type */}
                <div>
                    <label style={labelStyle}>Engineer Type</label>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        {ENG_TYPES.map(({ val, label }) => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => set('eng_type', val)}
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: '6px',
                                    fontSize: '14px', cursor: 'pointer', fontWeight: 500,
                                    border: form.eng_type === val ? 'none' : '1px solid var(--border)',
                                    background: form.eng_type === val ? 'var(--primary)' : 'var(--bg-primary)',
                                    color: form.eng_type === val ? '#fff' : 'var(--text)',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Meter Photo — only for onsite */}
                {form.eng_type === 'onsite' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 6 }}>
                        <input
                            type="checkbox"
                            id="meter-photo-check"
                            checked={form.require_meter_photo}
                            onChange={e => set('require_meter_photo', e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <label htmlFor="meter-photo-check" style={{ fontSize: '14px', cursor: 'pointer', margin: 0 }}>
                            📷 Meter Photo Required
                        </label>
                    </div>
                )}

                {/* Active toggle — edit only */}
                {isEdit && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 6 }}>
                        <input
                            type="checkbox"
                            id="active-check"
                            checked={form.is_active}
                            onChange={e => set('is_active', e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <label htmlFor="active-check" style={{ fontSize: '14px', cursor: 'pointer', margin: 0 }}>
                            ✅ Active
                        </label>
                    </div>
                )}

            </div>
        </Modal>
    );
}