'use client';

import { useState, useEffect, useCallback } from 'react';
import { PeonTask, PeonTaskConfig, PeonTaskLog, PEON_TASKS } from '@/types/peon';
import {
    fetchPeonActivityForDate, fetchActivePeonTaskConfig, savePeonTaskTime, swapPeonTaskOrder,
    saveTaskEdit, addCustomTask, deactivateCustomTask,
} from '@/services/peonService';

const todayStr = () => new Date().toLocaleDateString('en-CA');

interface PeonWithTasks {
    userId: string;
    name: string;
    doneIds: string[];
    logs: PeonTaskLog[];
    punch: any;
}

type TaskRow = PeonTask & { scheduled_time?: string };

export default function PeonActivityScreen() {
    const [date, setDate] = useState(todayStr());
    const [peons, setPeons] = useState<PeonWithTasks[]>([]);
    const [taskList, setTaskList] = useState<TaskRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskRow | null>(null);

    const [newIcon, setNewIcon] = useState('📋');
    const [newLabel, setNewLabel] = useState('');
    const [newGlabel, setNewGlabel] = useState('');
    const [newTime, setNewTime] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const { peonUsers, logsByPeon, punchByPeon } = await fetchPeonActivityForDate(date);
        const config: PeonTaskConfig[] = await fetchActivePeonTaskConfig();

        const stdIds = PEON_TASKS.map(t => t.id);
        const customTasks = config.filter(c => c.is_custom && !stdIds.includes(c.task_id));
        const sortMap: Record<string, number> = {};
        config.forEach(c => { sortMap[c.task_id] = c.sort_order != null ? c.sort_order : 999; });
        const cfgMap: Record<string, PeonTaskConfig> = {};
        config.forEach(c => { cfgMap[c.task_id] = c; });

        const allTasks: TaskRow[] = [
            ...PEON_TASKS.map(t => ({ ...t, scheduled_time: cfgMap[t.id]?.scheduled_time || undefined })),
            ...customTasks.map(c => ({ id: c.task_id, label: c.task_label || '', glabel: c.task_glabel || '', icon: c.task_icon || '📋', customDbId: c.id, scheduled_time: c.scheduled_time || undefined })),
        ].sort((a, b) => {
            const sa = sortMap[a.id] != null ? sortMap[a.id] : PEON_TASKS.findIndex(t => t.id === a.id);
            const sb = sortMap[b.id] != null ? sortMap[b.id] : PEON_TASKS.findIndex(t => t.id === b.id);
            return sa - sb;
        });
        setTaskList(allTasks);

        const peonsData: PeonWithTasks[] = peonUsers.map((u: any) => {
            const logs = logsByPeon[u.user_id] || [];
            const stdLogs = logs.filter((l: PeonTaskLog) => !l.task_name.startsWith('extra_'));
            return { userId: u.user_id, name: u.name, doneIds: stdLogs.map((l: PeonTaskLog) => l.task_name), logs, punch: punchByPeon[u.user_id] };
        });
        setPeons(peonsData);
        setLoading(false);
    }, [date]);

    useEffect(() => { load(); }, [load]);

    const handleTimeChange = async (task: TaskRow, value: string) => {
        await savePeonTaskTime(task.id, task.label, task.icon, value);
        await load();
    };

    const handleMove = async (taskId: string, dir: -1 | 1) => {
        const idx = taskList.findIndex(t => t.id === taskId);
        const swapIdx = idx + dir;
        if (idx < 0 || swapIdx < 0 || swapIdx >= taskList.length) return;
        await swapPeonTaskOrder(taskList[idx], taskList[swapIdx], swapIdx, idx);
        await load();
    };

    const handleAddCustom = async () => {
        if (!newLabel.trim()) { alert('Task name required'); return; }
        try {
            await addCustomTask(newLabel.trim(), newGlabel.trim(), newIcon.trim() || '📋', newTime);
            setNewLabel(''); setNewGlabel(''); setNewTime('');
            await load();
        } catch (e: any) {
            alert('Error adding task: ' + e.message);
        }
    };

    const handleDeleteCustom = async (dbId: string) => {
        if (!confirm('Remove this custom task?')) return;
        await deactivateCustomTask(dbId);
        await load();
    };

    const handleSaveEdit = async (label: string, glabel: string, icon: string) => {
        if (!editingTask) return;
        await saveTaskEdit(editingTask.customDbId, editingTask.id, label, glabel, icon);
        setEditingTask(null);
        await load();
    };

    if (loading) return <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;

    return (
        <div style={{ padding: '20px 24px' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 16px' }}>🧹 Peon Activity</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 16, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Date:</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                <span style={{ fontSize: 12, color: '#6b7280' }}>{peons.length} peon(s)</span>
            </div>

            <div style={{ marginBottom: 16 }}>
                <button onClick={() => setSettingsOpen(o => !o)} style={{ width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    ⚙️ Task Settings — Scheduled Times &amp; Custom Tasks
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280', fontWeight: 400 }}>{settingsOpen ? '▲ Collapse' : '▼ Click to expand'}</span>
                </button>
                {settingsOpen && (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 16 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Set each task&apos;s scheduled time — the peon will see it highlighted when overdue.</div>
                        {taskList.map((t, idx) => (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <button onClick={() => handleMove(t.id, -1)} disabled={idx === 0} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, width: 22, height: 20, fontSize: 11, cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#ccc' : '#111827', padding: 0, lineHeight: 1 }}>▲</button>
                                    <button onClick={() => handleMove(t.id, 1)} disabled={idx === taskList.length - 1} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, width: 22, height: 20, fontSize: 11, cursor: idx === taskList.length - 1 ? 'default' : 'pointer', color: idx === taskList.length - 1 ? '#ccc' : '#111827', padding: 0, lineHeight: 1 }}>▼</button>
                                </div>
                                <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
                                <span style={{ flex: 1, fontSize: 13 }}>{t.label}</span>
                                <input type="time" value={t.scheduled_time || ''} onChange={e => handleTimeChange(t, e.target.value)} style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12 }} />
                                <button onClick={() => setEditingTask(t)} title="Edit" style={{ background: 'none', border: '1px solid #93c5fd', borderRadius: 6, color: '#2563eb', fontSize: 12, cursor: 'pointer', padding: '3px 7px' }}>✏️</button>
                                {t.customDbId && (
                                    <button onClick={() => handleDeleteCustom(t.customDbId!)} title="Remove" style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 16, cursor: 'pointer', padding: '2px 6px' }}>✕</button>
                                )}
                            </div>
                        ))}

                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '2px dashed #e5e7eb' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>➕ Add New Custom Task</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input type="text" value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="Icon" style={{ width: 54, padding: 8, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 18, textAlign: 'center' }} />
                                    <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Task name (English)..." style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                                </div>
                                <input type="text" value={newGlabel} onChange={e => setNewGlabel(e.target.value)} placeholder="ગુજરાતી નામ (optional)..." style={{ padding: '8px 12px', border: '1.5px solid #a5f3fc', borderRadius: 8, fontSize: 13, background: '#f0fdff' }} />
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <label style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>Scheduled Time:</label>
                                    <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                                    <button onClick={handleAddCustom} style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {peons.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>No peon users found. Create a user with role=peon.</div>
            ) : peons.map(p => {
                const total = taskList.length;
                const pct = total ? Math.round((p.doneIds.length / total) * 100) : 0;
                const extraLogs = p.logs.filter(l => l.task_name.startsWith('extra_'));
                return (
                    <div key={p.userId} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700 }}>🧹 {p.name || p.userId}</div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                    Punch: {p.punch ? `${p.punch.punch_in_time}${p.punch.punch_out_time ? ` → ${p.punch.punch_out_time}` : ' (still on duty)'}` : 'Not punched in'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 20, fontWeight: 800, color: pct === 100 ? '#22c55e' : '#2563eb' }}>{p.doneIds.length}/{total}</div>
                                <div style={{ fontSize: 11, color: '#6b7280' }}>{pct}% done</div>
                            </div>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#2563eb', borderRadius: 3 }} />
                        </div>
                        {taskList.map(t => {
                            const done = p.doneIds.includes(t.id);
                            const log = p.logs.find(l => l.task_name === t.id);
                            const timeStr = log?.done_at ? new Date(log.done_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                            return (
                                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: 15 }}>{done ? '✅' : '⬜'}</span>
                                    <span style={{ flex: 1, fontSize: 13, color: done ? '#111827' : '#6b7280' }}>{t.icon} {t.label}{t.scheduled_time ? ` (${t.scheduled_time})` : ''}</span>
                                    <span style={{ fontSize: 11, color: '#6b7280' }}>{timeStr}</span>
                                </div>
                            );
                        })}
                        {extraLogs.length > 0 && (
                            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '2px dashed #e5e7eb' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>📝 EXTRA WORK</div>
                                {extraLogs.map(l => (
                                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: 14 }}>📝</span>
                                        <span style={{ flex: 1, fontSize: 13 }}>{l.task_label}</span>
                                        <span style={{ fontSize: 11, color: '#6b7280' }}>{l.extra_from || ''}{l.extra_to ? ` → ${l.extra_to}` : ''}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {editingTask && (
                <EditTaskModal task={editingTask} onSave={handleSaveEdit} onClose={() => setEditingTask(null)} />
            )}
        </div>
    );
}

function EditTaskModal({ task, onSave, onClose }: { task: TaskRow; onSave: (label: string, glabel: string, icon: string) => void; onClose: () => void }) {
    const [icon, setIcon] = useState(task.icon);
    const [label, setLabel] = useState(task.label);
    const [glabel, setGlabel] = useState(task.glabel);

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%' }}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>✏️ Edit Task</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input type="text" value={icon} onChange={e => setIcon(e.target.value)} style={{ width: 50, padding: 8, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 18, textAlign: 'center' }} />
                        <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="English name..." style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                    </div>
                    <input type="text" value={glabel} onChange={e => setGlabel(e.target.value)} placeholder="ગુજરાતી નામ..." style={{ padding: '8px 12px', border: '1.5px solid #a5f3fc', borderRadius: 8, fontSize: 13, background: '#f0fdff' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: 11, border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontWeight: 600, background: '#fff', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onSave(label, glabel, icon)} style={{ flex: 2, padding: 11, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, background: '#2563eb', color: '#fff', cursor: 'pointer' }}>💾 Save</button>
                </div>
            </div>
        </div>
    );
}