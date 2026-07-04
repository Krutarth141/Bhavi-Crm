'use client';

import { AppUser } from '@/types/users';

interface Props {
    user: AppUser;
    type: 'engineer' | 'wc';
    onEdit: (user: AppUser) => void;
    onToggle: (user: AppUser) => void;
    onDelete: (user: AppUser) => void;
}

export default function UserCard({ user, type, onEdit, onToggle, onDelete }: Props) {
    const initials = user.initials ||
        user.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

    const avatarColor = type === 'wc' ? '#7c3aed' : 'var(--primary, #185FA5)';

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 8,
            border: '1px solid var(--border)', marginBottom: 8,
            background: user.is_active ? 'var(--card, #fff)' : '#fafafa',
            opacity: user.is_active ? 1 : 0.7,
        }}>
            {/* Avatar */}
            <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: avatarColor, color: '#fff',
                fontWeight: 700, fontSize: 14, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>{user.user_id}</span>
                    {type === 'engineer' && user.eng_type && (
                        <span>{user.eng_type === 'onsite' ? '🚗 On Site' : '🏠 Carry In'}</span>
                    )}
                </div>
            </div>

            {/* Status badge */}
            <span
                onClick={() => onToggle(user)}
                title="Click to toggle active status"
                style={{
                    padding: '2px 10px', borderRadius: 12, fontSize: 11,
                    fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                    background: user.is_active ? '#d1fae5' : '#fee2e2',
                    color: user.is_active ? '#065f46' : '#991b1b',
                }}
            >
                {user.is_active ? '✅ Active' : '❌ Inactive'}
            </span>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                    onClick={() => onEdit(user)}
                    style={{
                        padding: '4px 10px', border: '1px solid var(--border)',
                        borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        background: 'transparent',
                    }}
                >
                    ✏️ Edit
                </button>
                <button
                    onClick={() => onDelete(user)}
                    style={{
                        padding: '4px 10px', border: 'none',
                        borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        background: '#fee2e2', color: '#991b1b',
                    }}
                >
                    🗑️
                </button>
            </div>
        </div>
    );
}