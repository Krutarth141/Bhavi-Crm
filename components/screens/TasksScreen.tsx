'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTasks } from '@/hooks/useTasks';
import TaskCard from '@/components/screens/tasks/TaskCard';
import TaskFormModal from '@/components/screens/tasks/TaskFormModal';
import {
    createTask,
    updateTask,
    deleteTask,
    closeTaskQuick,
    updateTaskWithRemark,
    generateTaskNo
} from '@/services/taskService';

export default function TasksScreen() {
    const { data: session } = useSession();
    const currentUser = (session?.user as any);
    const canEdit = currentUser?.role === 'admin';

    const { tasks, engineers, loading, error, refetch } = useTasks({
        userRole: currentUser?.role,
        userId: currentUser?.id
    });

    const [filter, setFilter] = useState<'open' | 'all' | 'closed'>('open');
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [selectedTaskData, setSelectedTaskData] = useState<any>(null);

    // Filter tasks based on selected filter
    const filteredTasks = tasks.filter(t => {
        if (filter === 'open') return t.status !== 'Closed';
        if (filter === 'closed') return t.status === 'Closed';
        return true;
    });

    // Count tasks by status
    const statusCounts = {
        open: tasks.filter(t => t.status !== 'Closed').length,
        all: tasks.length,
        closed: tasks.filter(t => t.status === 'Closed').length
    };

    // Handlers
    const handleCreateTask = async (formData: any) => {
        try {
            if (!formData.title.trim() || !formData.engineer) {
                alert('Please fill in title and select an engineer');
                return;
            }

            const [engId, engName] = formData.engineer.split('|');
            if (formData.dueDate && formData.dueDate < new Date().toISOString().split('T')[0]) {
                alert('Due date cannot be in the past');
                return;
            }

            const taskNo = await generateTaskNo();

            const result = await createTask({
                task_no: taskNo,
                title: formData.title,
                description: formData.description,
                assigned_to: engId,
                assigned_name: engName,
                priority: formData.priority,
                due_date: formData.dueDate || undefined,
                ticket_id: formData.ticketId || undefined,
                status: 'Open',
                created_by: currentUser?.name || 'Unknown',
                eng_remark: '',
                timeline: [
                    {
                        action: 'Created',
                        by: currentUser?.name || 'Unknown',
                        at: new Date().toISOString()
                    }
                ]
            });

            if (result.success) {
                alert('✅ Task created successfully!');
                setCreateModalOpen(false);
                await refetch();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (err) {
            console.error('Error creating task:', err);
            alert('Error: ' + (err as any).message);
        }
    };

    const handleUpdateTask = async (formData: any) => {
        try {
            if (!selectedTaskId) return;

            const result = await updateTaskWithRemark(
                selectedTaskId,
                formData.status,
                formData.remark,
                currentUser?.name || 'Unknown'
            );

            if (result.success) {
                alert('✅ Task updated successfully!');
                setSelectedTaskId(null);
                setSelectedTaskData(null);
                setUpdateModalOpen(false);
                await refetch();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (err) {
            console.error('Error updating task:', err);
            alert('Error: ' + (err as any).message);
        }
    };

    const handleCloseTask = async (taskId: string) => {
        try {
            const result = await closeTaskQuick(taskId, currentUser?.name || 'Unknown');
            if (result.success) {
                await refetch();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (err) {
            console.error('Error closing task:', err);
            alert('Error: ' + (err as any).message);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const result = await deleteTask(taskId);
            if (result.success) {
                await refetch();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (err) {
            console.error('Error deleting task:', err);
            alert('Error: ' + (err as any).message);
        }
    };

    const handleOpenUpdate = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            setSelectedTaskId(taskId);
            setSelectedTaskData({
                status: task.status,
                remark: task.eng_remark || ''
            });
            setUpdateModalOpen(true);
        }
    };

    const handleOpenCreate = () => {
        setCreateModalOpen(true);
    };

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Loading tasks...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px', color: '#dc2626' }}>
                Error: {error}
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}
            >
                <h2 style={{ margin: 0, fontSize: '24px' }}>📋 Tasks ({statusCounts.open} open)</h2>
                {canEdit && (
                    <button
                        onClick={handleOpenCreate}
                        style={{
                            background: '#7c3aed',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '9px 18px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        + New Task
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '20px',
                    borderBottom: '1px solid #e5e7eb',
                    paddingBottom: '12px'
                }}
            >
                {(['open', 'all', 'closed'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            background: filter === f ? '#7c3aed' : 'transparent',
                            color: filter === f ? '#fff' : '#6b7280',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}
                    >
                        {f === 'open' ? '📋 Open' : f === 'all' ? '📚 All' : '✅ Closed'}
                    </button>
                ))}
            </div>

            {/* Tasks List */}
            <div>
                {filteredTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                        No tasks found
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onUpdate={handleOpenUpdate}
                            onClose={handleCloseTask}
                            onDelete={handleDeleteTask}
                            canEdit={canEdit}
                        />
                    ))
                )}
            </div>

            {/* Modals */}
            {createModalOpen && (
                <TaskFormModal
                    isOpen={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    mode="create"
                    title="Create New Task"
                    engineers={engineers}
                    onSave={handleCreateTask}
                />
            )}

            {updateModalOpen && selectedTaskId && (
                <TaskFormModal
                    isOpen={updateModalOpen}
                    onClose={() => {
                        setUpdateModalOpen(false);
                        setSelectedTaskData(null);
                    }}
                    mode="update"
                    title="Update Task"
                    engineers={engineers}
                    onSave={handleUpdateTask}
                    initialData={selectedTaskData}
                />
            )}
        </div>
    );
}
