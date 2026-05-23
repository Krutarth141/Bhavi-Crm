'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

    return (
        <div className="content-section">
            <div className="section-header">
                <h2>👥 Customers</h2>
                <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
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
                                    <td>
                                        <button className="btn btn-sm btn-primary">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
