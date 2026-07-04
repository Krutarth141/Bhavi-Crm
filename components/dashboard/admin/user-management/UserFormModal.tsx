'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { AppUser, UserFormData, emptyUserForm, RoleType } from '@/types/users';

interface Props {
    isOpen: boolean;
    editingUser: AppUser | null;
    modalType: 'engineer' | 'wc';
    onClose: () => void;
    onSave: (form: UserFormData, id?: number) => Promise<void>;
}

const fieldStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
    borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const,
};
const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '14px' };

const ENG_TYPES = [
    { val: 'carryin' as const, label: '🏠 Carry In' },
    { val: 'onsite' as const, label: '🚗 On Site' },
];

export default function UserFormModal({ isOpen, editingUser, modalType, onClose, onSave }: Props) {
    const [form, setForm] = useState<UserFormData>(emptyUserForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const isEdit = !!editingUser;

    useEffect(() => {
        if (editingUser) {
            setForm({
                user_id: editingUser.user_id,
                name: editingUser.name,
                initials: editingUser.initials || '',
                password: '',
                role_type: editingUser.role_type,
                eng_type: editingUser.eng_type || 'carryin',
                is_active: editingUser.is_active,
            });
        } else {
            setForm({
                ...emptyUserForm,
                role_type: modalType === 'wc' ? 'work_controller' : 'engineer',
            });
        }
        setError('');
    }, [editingUser, modalType, isOpen]);

    const set = (key: keyof UserFormData, value: any) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Name is required'); return; }
        if (!form.user_id.trim()) { setError('User ID is required'); return; }
        if (!isEdit && !form.password.trim()) { setError('Password is required'); return; }
        setSaving(true);
        setError('');
        try {
            await onSave(form, editingUser?.id);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
                type="button" onClick={onClose}
                style={{ padding: '8px 16px', border: '1px solid var(--border)', background: 'var(--bg-primary)', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
            >
                Cancel
            </button>
            <button
                type="button" onClick={handleSave} disabled={saving}
                style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}
            >
                {saving ? 'Saving...' : isEdit ? '💾 Update' : '➕ Add'}
            </button>
        </div>
    );

    const title = isEdit
        ? `✏️ Edit ${modalType === 'wc' ? 'Work Controller' : 'Engineer'}`
        : `➕ Add ${modalType === 'wc' ? 'Work Controller' : 'Engineer'}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {error && (
                    <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
                        {error}
                    </div>
                )}

                {/* Name + Initials */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={labelStyle}>Name *</label>
                        <input type="text" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} style={fieldStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Initials</label>
                        <input type="text" placeholder="e.g. YS" maxLength={3} value={form.initials} onChange={e => set('initials', e.target.value.toUpperCase())} style={fieldStyle} />
                    </div>
                </div>

                {/* User ID + Password */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={labelStyle}>User ID (Login) *</label>
                        <input
                            type="text" placeholder="e.g. ENG001"
                            value={form.user_id}
                            onChange={e => set('user_id', e.target.value)}
                            disabled={isEdit}
                            style={{ ...fieldStyle, opacity: isEdit ? 0.6 : 1 }}
                        />
                        {isEdit && <small style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cannot be changed</small>}
                    </div>
                    <div>
                        <label style={labelStyle}>{isEdit ? 'New Password (blank = keep)' : 'Password *'}</label>
                        <input type="password" placeholder={isEdit ? 'Leave blank to keep' : 'Set password'} value={form.password} onChange={e => set('password', e.target.value)} style={fieldStyle} />
                    </div>
                </div>

                {/* Engineer Type — only for engineers */}
                {modalType === 'engineer' && (
                    <div>
                        <label style={labelStyle}>Engineer Type</label>
                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            {ENG_TYPES.map(({ val, label }) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => set('eng_type', val)}
                                    style={{
                                        flex: 1, padding: '8px 12px', borderRadius: 6,
                                        fontSize: 14, cursor: 'pointer', fontWeight: 500,
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
                )}

                {/* Active toggle — edit only */}
                {isEdit && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 6 }}>
                        <input
                            type="checkbox" id="user-active"
                            checked={form.is_active}
                            onChange={e => set('is_active', e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <label htmlFor="user-active" style={{ fontSize: 14, cursor: 'pointer', margin: 0 }}>✅ Active</label>
                    </div>
                )}
            </div>
        </Modal>
    );
}