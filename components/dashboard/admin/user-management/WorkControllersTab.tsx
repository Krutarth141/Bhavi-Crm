'use client';

import { AppUser } from '@/types/users';
import UserCard from './UserCard';

interface Props {
    workControllers: AppUser[];
    loading: boolean;
    onAdd: () => void;
    onEdit: (user: AppUser) => void;
    onToggle: (user: AppUser) => void;
    onDelete: (user: AppUser) => void;
}

export default function WorkControllersTab({ workControllers, loading, onAdd, onEdit, onToggle, onDelete }: Props) {
    const active = workControllers.filter(w => w.is_active).length;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {active} active / {workControllers.length} total
                </span>
                <button
                    onClick={onAdd}
                    style={{
                        padding: '7px 14px', background: '#7c3aed', color: '#fff',
                        border: 'none', borderRadius: 6, cursor: 'pointer',
                        fontSize: 13, fontWeight: 600,
                    }}
                >
                    ➕ Add Work Controller
                </button>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Loading...</p>
            ) : workControllers.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No work controllers yet</p>
            ) : (
                workControllers.map(u => (
                    <UserCard
                        key={u.id} user={u} type="wc"
                        onEdit={onEdit} onToggle={onToggle} onDelete={onDelete}
                    />
                ))
            )}
        </div>
    );
}