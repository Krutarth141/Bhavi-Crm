'use client';

import { AppUser } from '@/types/users';
import UserCard from './UserCard';

interface Props {
    engineers: AppUser[];
    loading: boolean;
    onAdd: () => void;
    onEdit: (user: AppUser) => void;
    onToggle: (user: AppUser) => void;
    onDelete: (user: AppUser) => void;
}

export default function EngineersTab({ engineers, loading, onAdd, onEdit, onToggle, onDelete }: Props) {
    const active = engineers.filter(e => e.is_active).length;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {active} active / {engineers.length} total
                </span>
                <button
                    onClick={onAdd}
                    style={{
                        padding: '7px 14px', background: 'var(--primary)', color: '#fff',
                        border: 'none', borderRadius: 6, cursor: 'pointer',
                        fontSize: 13, fontWeight: 600,
                    }}
                >
                    ➕ Add Engineer
                </button>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Loading...</p>
            ) : engineers.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No engineers yet</p>
            ) : (
                engineers.map(u => (
                    <UserCard
                        key={u.id} user={u} type="engineer"
                        onEdit={onEdit} onToggle={onToggle} onDelete={onDelete}
                    />
                ))
            )}
        </div>
    );
}