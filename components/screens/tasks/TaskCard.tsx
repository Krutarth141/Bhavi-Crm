'use client';

import { Task, statusBadges } from '@/types/tasks';

interface TaskCardProps {
    task: Task;
    onUpdate: (taskId: string) => void;
    onClose: (taskId: string) => void;
    onDelete: (taskId: string) => void;
    canEdit: boolean;
}

export default function TaskCard({
    task,
    onUpdate,
    onClose,
    onDelete,
    canEdit
}: TaskCardProps) {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Closed';
    const colors = statusBadges[task.status] || statusBadges['Open'];
    const lastTimeline = task.timeline?.filter(e => e.note)?.slice(-1)[0];

    return (
        <div
            style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '12px',
                borderLeft: '4px solid #7c3aed'
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px'
                }}
            >
                <div style={{ flex: 1 }}>
                    <b style={{ fontSize: '16px' }}>
                        {isOverdue && '🔴 '}
                        {task.title}
                    </b>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        {task.task_no}
                    </div>
                </div>
                <span
                    style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: colors.bg,
                        color: colors.text,
                        whiteSpace: 'nowrap',
                        marginLeft: '10px'
                    }}
                >
                    {task.status}
                </span>
            </div>

            {/* Description */}
            {task.description && (
                <div style={{ fontSize: '13px', marginBottom: '10px', color: '#374151' }}>
                    {task.description}
                </div>
            )}

            {/* Meta Info */}
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
                👷 {task.assigned_name || '—'} | 📅 {task.due_date || '—'} | {task.priority}
                {task.ticket_id && ` | 🎫 ${task.ticket_id}`}
            </div>

            {/* Engineer Remark */}
            {task.eng_remark && (
                <div
                    style={{
                        fontSize: '12px',
                        background: '#f3f4f6',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        marginBottom: '10px'
                    }}
                >
                    <b>Engineer Note:</b> {task.eng_remark}
                </div>
            )}

            {/* Last Timeline */}
            {lastTimeline && (
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px' }}>
                    Last: {new Date(lastTimeline.at).toLocaleString('en-IN')}
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {task.status !== 'Closed' && canEdit && (
                    <button
                        onClick={() => onClose(task.id)}
                        style={{
                            padding: '6px 12px',
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        ✅ Done
                    </button>
                )}
                <button
                    onClick={() => onUpdate(task.id)}
                    style={{
                        padding: '6px 12px',
                        background: '#e5e7eb',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                    }}
                >
                    ✏️ Update
                </button>
                {canEdit && (
                    <button
                        onClick={() => onDelete(task.id)}
                        style={{
                            padding: '6px 12px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        🗑️ Delete
                    </button>
                )}
            </div>
        </div>
    );
}
