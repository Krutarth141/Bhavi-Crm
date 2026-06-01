'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { Customer } from '@/types/customers';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Customer, 'updated_at'>) => Promise<void>;
    initialData?: Partial<Customer>;
    loading?: boolean;
}

const defaultFormData = {
    cname: '',
    mobile: '',
    alt_mobile: '',
    serial: '',
    model: '',
    address: '',
    city: '',
    pin: '',
    area: '',
    state: ''
};

export default function CustomerFormModal({ isOpen, onClose, onSubmit, initialData, loading = false }: CustomerFormModalProps) {
    const [formData, setFormData] = useState({ ...defaultFormData, ...initialData });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.cname || !formData.mobile) { alert('Name and Mobile are required'); return; }
        if (!formData.serial) { alert('Serial is required (it is the unique ID)'); return; }
        await onSubmit(formData as any);
        setFormData(defaultFormData);
        onClose();
    };

    const field = (label: string, key: keyof typeof defaultFormData, type = 'text', required = false) => (
        <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '14px' }}>
                {label} {required && '*'}
            </label>
            <input
                type={type}
                required={required}
                value={(formData as any)[key] || ''}
                onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                style={{
                    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                    borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box'
                }}
            />
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData?.serial ? 'Edit Customer' : 'Add New Customer'}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {field('Name', 'cname', 'text', true)}
                {field('Mobile', 'mobile', 'tel', true)}
                {field('Alternate Mobile', 'alt_mobile', 'tel')}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {field('Serial *', 'serial')}
                    {field('Model', 'model')}
                </div>
                {field('Address', 'address')}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {field('City', 'city')}
                    {field('Pin', 'pin')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {field('Area', 'area')}
                    {field('State', 'state')}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button type="button" onClick={onClose}
                        style={{
                            padding: '8px 16px', border: '1px solid var(--border)',
                            background: 'var(--bg-primary)', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'
                        }}>
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}
                        style={{
                            padding: '8px 16px', background: 'var(--primary)', color: 'white',
                            border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px', opacity: loading ? 0.6 : 1
                        }}>
                        {loading ? 'Saving...' : initialData?.serial ? 'Update' : 'Create'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}