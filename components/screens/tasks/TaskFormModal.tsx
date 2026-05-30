'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { PRIORITY_OPTIONS, STATUS_OPTIONS, Engineer } from '@/types/tasks';

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'update';
    title: string;
    engineers: Engineer[];
    onSave: (formData: any) => void;
    initialData?: {
        title: string;
        description: string;
        engineer: string;
        priority: string;
        dueDate: string;
        ticketId: string;
        status?: string;
        remark?: string;
    };
}

export default function TaskFormModal({
    isOpen,
    onClose,
    mode,
    title,
    engineers,
    onSave,
    initialData
}: TaskFormModalProps) {
    const defaultFormData = {
        title: '',
        description: '',
        engineer: '',
        priority: 'Normal',
        dueDate: '',
        ticketId: '',
        status: 'Open',
        remark: ''
    };

    const [formData, setFormData] = useState(
        initialData ? { ...defaultFormData, ...initialData } : defaultFormData
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        onSave(formData);
        // Reset form after submit
        setFormData(
            initialData ? { ...defaultFormData, ...initialData } : defaultFormData
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', maxHeight: '70vh', overflowY: 'auto' }}>
                {mode === 'create' && (
                    <>
                        <div>
                            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Title *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Task title"
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    marginTop: '4px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Optional description"
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    marginTop: '4px',
                                    boxSizing: 'border-box',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Assign to Engineer *</label>
                            <select
                                name="engineer"
                                value={formData.engineer}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    marginTop: '4px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="">-- Select Engineer --</option>
                                {engineers.map(eng => (
                                    <option key={eng.eng_id} value={`${eng.eng_id}|${eng.name}`}>
                                        {eng.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Priority</label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        marginTop: '4px',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    {PRIORITY_OPTIONS.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Due Date</label>
                                <input
                                    type="date"
                                    name="dueDate"
                                    value={formData.dueDate}
                                    onChange={handleChange}
                                    min={new Date().toISOString().split('T')[0]}
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        marginTop: '4px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Related Ticket ID (optional)</label>
                            <input
                                type="text"
                                name="ticketId"
                                value={formData.ticketId}
                                onChange={handleChange}
                                placeholder="e.g. TKT-2024-001"
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    marginTop: '4px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </>
                )}

                {mode === 'update' && (
                    <>
                        <div>
                            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    marginTop: '4px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Engineer Remark / Note</label>
                            <textarea
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                placeholder="Add update notes or engineer remarks..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    marginTop: '4px',
                                    boxSizing: 'border-box',
                                    resize: 'vertical'
                                }}
                            />
                        </div>
                    </>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button
                        onClick={handleSubmit}
                        style={{
                            flex: 1,
                            background: '#7c3aed',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        {mode === 'create' ? 'Create Task' : 'Save Changes'}
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
}
