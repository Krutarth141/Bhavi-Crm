'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';

interface Customer {
    serial: string;
    cname: string;
    mobile: string;
    alt_mobile: string | null;
    city: string;
    state: string;
    address: string;
    pin: string | null;
    area: string | null;
    model: string | null;
    updated_at: string;
}

export default function CustomersScreen() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({
        serial: '',
        cname: '',
        mobile: '',
        alt_mobile: '',
        city: '',
        state: '',
        address: '',
        pin: '',
        area: '',
        model: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setCustomers(data || []);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter((cust) =>
        cust.cname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.mobile.includes(searchTerm)
    );

    const handleAddCustomer = () => {
        setFormData({
            serial: '',
            cname: '',
            mobile: '',
            alt_mobile: '',
            city: '',
            state: '',
            address: '',
            pin: '',
            area: '',
            model: '',
        });
        setSelectedCustomer(null);
        setShowAddForm(true);
    };

    const handleViewCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowViewModal(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
            if (!formData.serial || !formData.cname || !formData.mobile) {
                alert('Serial, Name, and Mobile are required');
                setSubmitting(false);
                return;
            }

            const dataToSubmit = {
                ...formData,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('customers')
                .upsert([dataToSubmit], { onConflict: 'serial' });

            if (error) throw error;

            alert('✅ Customer saved successfully!');
            setShowAddForm(false);
            fetchCustomers();
        } catch (err: any) {
            alert('❌ Error: ' + (err.message || 'Failed to save customer'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCustomer = async (serial: string) => {
        if (!confirm('Are you sure you want to delete this customer?')) return;

        try {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('serial', serial);

            if (error) throw error;

            alert('✅ Customer deleted successfully!');
            fetchCustomers();
        } catch (err: any) {
            alert('❌ Error: ' + (err.message || 'Failed to delete customer'));
        }
    };

    return (
        <div className="content-section">
            <div className="section-header">
                <h2>👥 Customers</h2>
                <button className="btn btn-primary" onClick={handleAddCustomer}>
                    ➕ Add Customer
                </button>
            </div>

            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="Search by name or mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1 }}
                />
            </div>

            {loading ? (
                <p className="loading">Loading customers...</p>
            ) : filteredCustomers.length === 0 ? (
                <p className="empty-message">No customers found</p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Serial</th>
                                <th>Name</th>
                                <th>Mobile</th>
                                <th>Alt Mobile</th>
                                <th>City</th>
                                <th>State</th>
                                <th>Area</th>
                                <th>Address</th>
                                <th>Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.serial}>
                                    <td>
                                        <strong>{customer.serial}</strong>
                                    </td>
                                    <td>
                                        <strong>{customer.cname || '—'}</strong>
                                    </td>
                                    <td>{customer.mobile || '—'}</td>
                                    <td>{customer.alt_mobile || '—'}</td>
                                    <td>{customer.city || '—'}</td>
                                    <td>{customer.state || '—'}</td>
                                    <td>{customer.area || '—'}</td>
                                    <td style={{ fontSize: '12px', maxWidth: '200px' }}>
                                        {customer.address || '—'}
                                    </td>
                                    <td style={{ fontSize: '12px' }}>
                                        {customer.updated_at ? new Date(customer.updated_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap', gap: '4px', display: 'flex' }}>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleViewCustomer(customer)}
                                        >
                                            👁 View
                                        </button>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDeleteCustomer(customer.serial)}
                                            style={{ background: '#f05252' }}
                                        >
                                            🗑 Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Customer Modal */}
            <Modal
                isOpen={showAddForm}
                title="Add Customer"
                onClose={() => setShowAddForm(false)}
                footer={
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" onClick={() => setShowAddForm(false)}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmitForm}
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : '💾 Save Customer'}
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleSubmitForm} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div className="form-group">
                        <label>Serial No. *</label>
                        <input type="text" name="serial" value={formData.serial} onChange={handleFormChange} placeholder="SN001" required />
                    </div>
                    <div className="form-group">
                        <label>Customer Name *</label>
                        <input type="text" name="cname" value={formData.cname} onChange={handleFormChange} placeholder="Full name" required />
                    </div>
                    <div className="form-group">
                        <label>Mobile *</label>
                        <input type="tel" name="mobile" value={formData.mobile} onChange={handleFormChange} placeholder="10 digit" required />
                    </div>
                    <div className="form-group">
                        <label>Alt Mobile</label>
                        <input type="tel" name="alt_mobile" value={formData.alt_mobile} onChange={handleFormChange} placeholder="Alternate" />
                    </div>
                    <div className="form-group">
                        <label>City</label>
                        <input type="text" name="city" value={formData.city} onChange={handleFormChange} placeholder="City name" />
                    </div>
                    <div className="form-group">
                        <label>State</label>
                        <input type="text" name="state" value={formData.state} onChange={handleFormChange} placeholder="State" />
                    </div>
                    <div className="form-group">
                        <label>Area</label>
                        <input type="text" name="area" value={formData.area} onChange={handleFormChange} placeholder="Area/locality" />
                    </div>
                    <div className="form-group">
                        <label>PIN</label>
                        <input type="text" name="pin" value={formData.pin} onChange={handleFormChange} placeholder="PIN code" />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                        <label>Address</label>
                        <textarea name="address" value={formData.address} onChange={handleFormChange} placeholder="Full address" rows={2} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                        <label>Model</label>
                        <input type="text" name="model" value={formData.model} onChange={handleFormChange} placeholder="Product model" />
                    </div>
                </form>
            </Modal>

            {/* View Customer Modal */}
            <Modal
                isOpen={showViewModal}
                title="Customer Details"
                onClose={() => setShowViewModal(false)}
                footer={
                    <button className="btn btn-outline" onClick={() => setShowViewModal(false)}>
                        Close
                    </button>
                }
            >
                {selectedCustomer && (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><strong>Serial:</strong> {selectedCustomer.serial}</div>
                            <div><strong>Name:</strong> {selectedCustomer.cname}</div>
                            <div><strong>Mobile:</strong> {selectedCustomer.mobile}</div>
                            <div><strong>Alt Mobile:</strong> {selectedCustomer.alt_mobile || '—'}</div>
                            <div><strong>City:</strong> {selectedCustomer.city}</div>
                            <div><strong>State:</strong> {selectedCustomer.state}</div>
                            <div><strong>Area:</strong> {selectedCustomer.area || '—'}</div>
                            <div><strong>PIN:</strong> {selectedCustomer.pin || '—'}</div>
                        </div>
                        <div><strong>Address:</strong> {selectedCustomer.address}</div>
                        <div><strong>Model:</strong> {selectedCustomer.model || '—'}</div>
                        <div><strong>Updated:</strong> {new Date(selectedCustomer.updated_at).toLocaleString()}</div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
