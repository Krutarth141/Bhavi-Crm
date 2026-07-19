'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePeonDashboard } from '@/hooks/usePeonDashboard';
import PeonTaskModal from '@/components/screens/peon/PeonTaskModal';

function formatSchedTime(schedTime: string) {
    const [sh, sm] = schedTime.split(':');
    const hr = parseInt(sh, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const dh = hr > 12 ? hr - 12 : hr || 12;
    return `${dh}:${sm} ${ampm} સુધીમાં`;
}

export default function PeonDashboard() {
    const { data: session } = useSession();
    const peonId = (session?.user as any)?.email || ''; // holds user_id, e.g. 'PEON001'
    const peonName = (session?.user as any)?.name || '';

    const { tasks, doneTaskIds, extraLogs, scheduledTimes, punch, loading, toggleTask, addExtra, removeExtra, punchIn, punchOut } = usePeonDashboard(peonId, peonName);

    const [activeModal, setActiveModal] = useState<{ id: string; label: string; glabel: string; icon: string } | null>(null);
    const [extraNote, setExtraNote] = useState('');
    const [extraFrom, setExtraFrom] = useState('');
    const [extraTo, setExtraTo] = useState('');

    const doneCount = doneTaskIds.length;
    const totalCount = tasks.length;
    const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
    const nowHHMM = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const handleTaskClick = (task: typeof tasks[number]) => {
        if (doneTaskIds.includes(task.id)) {
            if (!confirm(`↩️ ${task.label}\n${task.glabel}\n\nUndo this completed task?`)) return;
            toggleTask(task.id, task.label);
        } else {
            setActiveModal({ id: task.id, label: task.label, glabel: task.glabel, icon: task.icon });
        }
    };

    const confirmTask = async (time: string) => {
        if (!activeModal) return;
        await toggleTask(activeModal.id, activeModal.label, time);
        setActiveModal(null);
    };

    const handleSaveExtra = async () => {
        if (!extraNote.trim()) { alert('Please describe the work done.'); return; }
        await addExtra(extraNote.trim(), extraFrom, extraTo);
        setExtraNote(''); setExtraFrom(''); setExtraTo('');
    };

    if (loading) return <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;

    return (
        <div style={{ padding: '20px 24px', maxWidth: 640, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: punch ? '#fef2f2' : '#f0fdf4', border: `1.5px solid ${punch ? '#fecaca' : '#bbf7d0'}`, borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{punch ? '🔴 On Duty' : '🟢 Ready'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{punch ? `Started: ${punch.punch_in_time}` : 'Click to start duty'}</div>
                </div>
                {punch
                    ? <button onClick={punchOut} style={{ padding: '10px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>⏹ Punch Out</button>
                    : <button onClick={punchIn} style={{ padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>▶ Punch In</button>}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>Today&apos;s Tasks</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: pct === 100 ? '#22c55e' : '#2563eb' }}>{doneCount}/{totalCount}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Completed</div>
                    </div>
                </div>
                <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#22c55e,#0d9488)', borderRadius: 4, transition: 'width .4s' }} />
                </div>

                {tasks.map(task => {
                    const isDone = doneTaskIds.includes(task.id);
                    const schedTime = scheduledTimes[task.id];
                    const isOverdue = !!schedTime && !isDone && nowHHMM > schedTime;
                    return (
                        <div key={task.id} onClick={() => handleTaskClick(task)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 10, borderRadius: 12, background: isDone ? '#f0fdf4' : isOverdue ? '#fff1f2' : '#fff', border: `2px solid ${isDone ? '#22c55e' : isOverdue ? '#fca5a5' : '#e5e7eb'}`, cursor: 'pointer' }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', border: `2.5px solid ${isDone ? '#22c55e' : isOverdue ? '#ef4444' : '#cbd5e1'}`, background: isDone ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontWeight: 900 }}>{isDone ? '✓' : ''}</div>
                            <div style={{ fontSize: 22, flexShrink: 0 }}>{task.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: isDone ? '#15803d' : isOverdue ? '#b91c1c' : '#111827', textDecoration: isDone ? 'line-through' : 'none' }}>{task.label}</div>
                                {task.glabel && <div style={{ fontSize: 13, color: isDone ? '#16a34a' : isOverdue ? '#dc2626' : '#6b7280' }}>{task.glabel}</div>}
                                {schedTime && <div style={{ fontSize: 11, color: isOverdue ? '#ef4444' : '#0891b2', fontWeight: 600, marginTop: 2 }}>⏰ {formatSchedTime(schedTime)}{isOverdue ? ' — મોડું થઈ ગયું!' : ''}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>➕ Extra / Custom Work</div>
                {extraLogs.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 8, borderRadius: 10, background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
                        <span style={{ fontSize: 16 }}>📝</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{l.task_label}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{l.extra_from || ''}{l.extra_to ? ` → ${l.extra_to}` : ''}</div>
                        </div>
                        <button onClick={() => removeExtra(l.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 18, cursor: 'pointer' }}>✕</button>
                    </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <input type="text" value={extraNote} onChange={e => setExtraNote(e.target.value)} placeholder="Describe the work done..." style={{ padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <label style={{ fontSize: 12, color: '#6b7280' }}>From:</label>
                        <input type="time" value={extraFrom} onChange={e => setExtraFrom(e.target.value)} style={{ flex: 1, padding: 8, border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                        <label style={{ fontSize: 12, color: '#6b7280' }}>To:</label>
                        <input type="time" value={extraTo} onChange={e => setExtraTo(e.target.value)} style={{ flex: 1, padding: 8, border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                        <button onClick={handleSaveExtra} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                    </div>
                </div>
            </div>

            {activeModal && (
                <PeonTaskModal label={activeModal.label} glabel={activeModal.glabel} icon={activeModal.icon} onConfirm={confirmTask} onClose={() => setActiveModal(null)} />
            )}
        </div>
    );
}