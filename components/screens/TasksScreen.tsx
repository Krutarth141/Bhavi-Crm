'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';

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
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assigned_name: '',
        priority: 'Normal',
        status: 'Open',
        due_date: '',
        ticket_id: '',
        eng_remark: '',
    });

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

    const handleAddTask = () => {
        setFormData({
            title: '',
            description: '',
            assigned_name: '',
            priority: 'Normal',
            status: 'Open',
            due_date: '',
            ticket_id: '',
            eng_remark: '',
        });
        setSelectedTask(null);
        setShowNewForm(true);
    };

    const handleViewTask = (task: Task) => {
        setSelectedTask(task);
        setShowViewModal(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (!formData.title) {
                alert('Title is required');
                setSubmitting(false);
                return;
            }

            const dataToSubmit = {
                ...formData,
                updated_at: new Date().toISOString(),
            };

            if (selectedTask?.id) {
                const { error } = await supabase
                    .from('tasks')
                    .update(dataToSubmit)
                    .eq('id', selectedTask.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('tasks')
                    .insert([dataToSubmit]);
                if (error) throw error;
            }

            alert('✅ Task saved successfully!');
            setShowNewForm(false);
            fetchTasks();
        } catch (err: any) {
            alert('❌ Error: ' + (err.message || 'Failed to save task'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('✅ Task deleted successfully!');
            fetchTasks();
        } catch (err: any) {
            alert('❌ Error: ' + (err.message || 'Failed to delete task'));
        }
    };

    return (
        <div className="content-section">
            <div className="section-header">
                <h2>✅ Tasks Management</h2>
                <button className="btn btn-primary" onClick={handleAddTask}>
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
                                <div>📅 {task.due_date || 'No due date'}</div>
                                <div style={{ color: task.priority === 'High' ? '#f05252' : '#d97706' }}>
                                    🎯 {task.priority}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleViewTask(task)}
                                >
                                    👁 View
                                </button>
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDeleteTask(task.id)}
                                    style={{ background: '#f05252' }}
                                >
                                    🗑 Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Task Modal */}
            <Modal
                isOpen={showNewForm}
                title={selectedTask ? 'Edit Task' : 'New Task'}
                onClose={() => setShowNewForm(false)}
                footer={
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" onClick={() => setShowNewForm(false)}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmitForm}
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : '💾 Save Task'}
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleSubmitForm} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                        <label>Title *</label>
                        <input type="text" name="title" value={formData.title} onChange={handleFormChange} placeholder="Task title" required />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                        <label>Description</label>
                        <textarea name="description" value={formData.description} onChange={handleFormChange} placeholder="Task description" rows={2} />
                    </div>
                    <div className="form-group">
                        <label>Assigned To</label>
                        <input type="text" name="assigned_name" value={formData.assigned_name} onChange={handleFormChange} placeholder="Engineer name" />
                    </div>
                    <div className="form-group">
                        <label>Due Date</label>
                        <input type="date" name="due_date" value={formData.due_date} onChange={handleFormChange} />
                    </div>
                    <div className="form-group">
                        <label>Priority</label>
                        <select name="priority" value={formData.priority} onChange={handleFormChange}>
                            <option value="Low">Low</option>
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Status</label>
                        <select name="status" value={formData.status} onChange={handleFormChange}>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Ticket ID</label>
                        <input type="text" name="ticket_id" value={formData.ticket_id} onChange={handleFormChange} placeholder="BEA-2026-001" />
                    </div>
                </form>
            </Modal>

            {/* View Task Modal */}
            <Modal
                isOpen={showViewModal}
                title="Task Details"
                onClose={() => setShowViewModal(false)}
                footer={
                    <button className="btn btn-outline" onClick={() => setShowViewModal(false)}>
                        Close
                    </button>
                }
            >
                {selectedTask && (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div><strong>Title:</strong> {selectedTask.title}</div>
                        <div><strong>Description:</strong> {selectedTask.description || '—'}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><strong>Status:</strong> {selectedTask.status}</div>
                            <div><strong>Priority:</strong> {selectedTask.priority}</div>
                            <div><strong>Assigned To:</strong> {selectedTask.assigned_name || '—'}</div>
                            <div><strong>Due Date:</strong> {selectedTask.due_date || '—'}</div>
                        </div>
                        <div><strong>Ticket ID:</strong> {selectedTask.ticket_id || '—'}</div>
                        <div><strong>Engineer Remark:</strong> {selectedTask.eng_remark || '—'}</div>
                        <div><strong>Created:</strong> {new Date(selectedTask.created_at).toLocaleString()}</div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
