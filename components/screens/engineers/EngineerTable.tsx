'use client';

import { Engineer } from '@/hooks/useEngineers';

interface Props {
    engineers: Engineer[];
    onEdit: (eng: Engineer) => void;
    onToggleActive: (id: string, current: boolean) => void;
    onDelete: (id: string) => void;
}

export default function EngineerTable({ engineers, onEdit, onToggleActive, onDelete }: Props) {
    if (!engineers.length) {
        return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No engineers found</p>;
    }

    return (
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>#</th><th>Name</th><th>ID</th><th>Initials</th>
                        <th>Type</th><th>Meter Photo</th><th>Status</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {engineers.map((eng, i) => (
                        <tr key={eng.id}>
                            <td>{i + 1}</td>
                            <td><strong>{eng.name}</strong></td>
                            <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{eng.user_id}</td>
                            <td>
                                {eng.initials ? (
                                    <span style={{ background: 'var(--color-primary,#185FA5)', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                                        {eng.initials}
                                    </span>
                                ) : '—'}
                            </td>
                            <td>
                                <span style={{
                                    background: eng.eng_type === 'onsite' ? '#d1fae5' : '#fef3c7',
                                    color: eng.eng_type === 'onsite' ? '#065f46' : '#92400e',
                                    borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 500,
                                }}>
                                    {eng.eng_type === 'onsite' ? '🚗 On Site' : '🏠 Carry In'}
                                </span>
                            </td>
                            <td>
                                {eng.eng_type === 'onsite' ? (
                                    <span style={{
                                        background: eng.require_meter_photo ? '#fee2e2' : '#e0f2fe',
                                        color: eng.require_meter_photo ? '#991b1b' : '#0369a1',
                                        borderRadius: 4, padding: '2px 8px', fontSize: 12,
                                    }}>
                                        {eng.require_meter_photo ? '📷 Required' : '📷 Optional'}
                                    </span>
                                ) : '—'}
                            </td>
                            <td>
                                <span
                                    onClick={() => onToggleActive(eng.id, eng.is_active)}
                                    title="Click to toggle"
                                    style={{
                                        background: eng.is_active ? '#d1fae5' : '#fee2e2',
                                        color: eng.is_active ? '#065f46' : '#991b1b',
                                        borderRadius: 4, padding: '2px 8px', fontSize: 12,
                                        cursor: 'pointer', fontWeight: 500,
                                    }}
                                >
                                    {eng.is_active ? '✅ Active' : '❌ Inactive'}
                                </span>
                            </td>
                            <td style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-sm btn-secondary" onClick={() => onEdit(eng)}>✏️ Edit</button>
                                <button className="btn btn-sm btn-danger" onClick={() => onDelete(eng.id)}>🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}