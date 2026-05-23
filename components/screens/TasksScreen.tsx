'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Task {
    id: string;
    task_no: string | null;
    title: string;
    description: string | null;
    assigned_to: string | null;
    assigned_name: string | null;
    priority: string;
    status: string;
    due_date: string | null;
    ticket_id: string | null;
    eng_remark: string | null;
    created_at: string;
    updated_at: string;
}

export default function TasksScreen() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [showNewForm, setShowNewForm] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('updated_at', { ascending: false });
            
            if (error) throw error;
            setTasks(data || []);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredTasks = tasks.filter((task) => {
        const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
        return matchesStatus && matchesPriority;
    });

    const statusCounts = {
        Open: tasks.filter((t) => t.status === 'Open').length,
        'In Progress': tasks.filter((t) => t.status === 'In Progress').length,
        'On Hold': tasks.filter((t) => t.status === 'On Hold').length,
        Closed: tasks.filter((t) => t.status === 'Closed').length,
    };

    return (
        <div className="content-section">
            <div className="section-header">
                <h2>✅ Tasks Management</h2>
                <button className="btn btn-primary" onClick={() => setShowNewForm(true)}>
                    ➕ New Task
                </button>
            </div>

            {/* Status Cards */}
            <div className="inv-grid" style={{ marginBottom: '18px' }}>
                {Object.entries(statusCounts).map(([status, count]) => (
                    <div
                        key={status}
                        className="inv-stat"
                        onClick={() => setFilterStatus(status)}
                        style={{
                            background: filterStatus === status ? '#ede9fe' : 'var(--card)',
                            cursor: 'pointer',
                            borderLeft:
                                filterStatus === status ? '4px solid var(--primary)' : 'none',
                        }}
                    >
                        <div className="val">{count}</div>
                        <div className="lbl">{status}</div>
                    </div>
                ))}
            </div>

            <div className="filter-bar">
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Closed">Closed</option>
                </select>
                <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                >
                    <option value="all">All Priority</option>
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                </select>
            </div>

            {loading ? (
                <p className="loading">Loading tasks...</p>
            ) : filteredTasks.length === 0 ? (
                <p className="empty-message">No tasks found</p>
            ) : (
                <div className="tasks-list">
                    {filteredTasks.map((task) => (
                        <div key={task.id} className="task-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 6px 0', color: '#111827' }}>
                                        {task.title}
                                    </h3>
                                    <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '13px' }}>
                                        {task.description || '—'}
                                    </p>
                                </div>
                                <span
                                    className={`badge badge-${task.status.toLowerCase().replace(' ', '-')}`}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    {task.status}
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    gap: '12px',
                                    margin: '10px 0',
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    flexWrap: 'wrap'
                                }}
                            >
                                <div>👤 {task.assigned_name || task.assigned_to || 'Unassigned'}</div>
                                <div
                                    style={{
                                        color:
                                            task.priority === 'High'
                                                ? '#f05252'
                                                : task.priority === 'Normal'
                                                    ? '#ff9800'
                                                    : '#10b981',
                                    }}
                                >
                                    {task.priority} Priority
                                </div>
                                {task.due_date && (
                                    <div>📅 {new Date(task.due_date).toLocaleDateString()}</div>
                                )}
                            </div>

                            {task.ticket_id && (
                                <div style={{ fontSize: '12px', color: '#1a56db', marginTop: '6px' }}>
                                    🔗 Ticket: {task.ticket_id}
                                </div>
                            )}

                            {task.eng_remark && (
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>
                                    💬 {task.eng_remark}
                                </div>
                            )}

                            <button
                                className="btn btn-sm btn-outline"
                                style={{ marginTop: '10px' }}
                            >
                                Update Status
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
