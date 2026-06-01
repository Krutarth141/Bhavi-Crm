'use client';

import { useState, useEffect } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import CustomerTable from '@/components/screens/customers/CustomerTable';
import { downloadCustomerTemplate, exportCustomers, importCustomersFromFile } from '@/services/customerService';

export default function CustomersScreen() {
    const { customers, loading, error, refetch } = useCustomers();
    const [searchQuery, setSearchQuery] = useState('');
    const [importing, setImporting] = useState(false);
    const [displayedCustomers, setDisplayedCustomers] = useState(customers);

    // Real-time filter as user types
    useEffect(() => {
        if (!searchQuery.trim()) {
            setDisplayedCustomers(customers);
            return;
        }

        const q = searchQuery.toLowerCase();
        const filtered = customers.filter(c =>
            [c.cname, c.mobile, c.serial, c.model, c.city, c.address].some(
                v => (v || '').toLowerCase().includes(q)
            )
        );
        setDisplayedCustomers(filtered);
    }, [customers, searchQuery]);

    // Handle import customers
    const handleImportCustomers = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                setImporting(true);
                const result = await importCustomersFromFile(file);
                alert(`Imported: ${result.count} | Errors: ${result.errors}`);
                refetch();
            } catch (err) {
                console.error('Error importing:', err);
                alert('Failed to import customers');
            } finally {
                setImporting(false);
            }
        };
        input.click();
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px'
                }}
            >
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>
                    Customers ({customers.length})
                </h1>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => downloadCustomerTemplate()}
                        style={{
                            padding: '8px 16px',
                            background: '#f3f4f6',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        📄 Template
                    </button>
                    <button
                        onClick={handleImportCustomers}
                        disabled={importing}
                        style={{
                            padding: '8px 16px',
                            background: '#f3f4f6',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: importing ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: importing ? 0.6 : 1
                        }}
                    >
                        📥 Import
                    </button>
                    <button
                        onClick={() => exportCustomers(displayedCustomers)}
                        style={{
                            padding: '8px 16px',
                            background: '#f3f4f6',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        📤 Export
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div
                    style={{
                        padding: '12px 16px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '14px'
                    }}
                >
                    Error: {error}
                </div>
            )}

            {/* Search Bar */}
            <div
                style={{
                    marginBottom: '16px',
                    display: 'flex',
                    gap: '8px'
                }}
            >
                <input
                    type="text"
                    placeholder="Name, mobile, serial, city..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                    }}
                />
            </div>

            {/* Table Card */}
            <div
                style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}
            >
                <CustomerTable
                    customers={displayedCustomers}
                    loading={loading}
                    showActions={false}
                />
            </div>
        </div>
    );
}
