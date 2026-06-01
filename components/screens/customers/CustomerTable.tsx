'use client';

import { Customer } from '@/types/customers';

interface CustomerTableProps {
    customers: Customer[];
    onEdit?: (customer: Customer) => void;
    onDelete?: (serial: string) => void;
    loading?: boolean;
    showActions?: boolean;
}

export default function CustomerTable({
    customers,
    onEdit,
    onDelete,
    loading = false,
    showActions = true
}: CustomerTableProps) {
    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading customers...</div>;
    }

    if (customers.length === 0) {
        return <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No results</div>;
    }

    const tdStyle = { padding: '12px 16px', fontSize: '14px' };
    const thStyle = { padding: '12px 16px', textAlign: 'left' as const, fontWeight: 600, fontSize: '14px' };

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Mobile</th>
                        <th style={thStyle}>Serial</th>
                        <th style={thStyle}>Model</th>
                        <th style={thStyle}>City</th>
                        <th style={thStyle}>Address</th>
                        <th style={thStyle}>Pin</th>
                        {showActions && <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {customers.map((customer, idx) => (
                        <tr
                            key={customer.serial}
                            style={{
                                borderBottom: '1px solid var(--border)',
                                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb'
                            }}
                        >
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{customer.cname || '-'}</td>
                            <td style={tdStyle}>
                                <a
                                    href={'tel:' + customer.mobile}
                                    style={{ color: '#ec4899', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {'📞 ' + (customer.mobile || '-')}
                                </a>
                                {customer.mobile && (
                                    <a
                                        href={'https://wa.me/91' + customer.mobile.replace(/\D/g, '')}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ marginLeft: '8px', color: '#25D366', fontSize: '13px', textDecoration: 'none' }}
                                    >
                                        💬
                                    </a>
                                )}
                            </td>
                            <td style={tdStyle}>{customer.serial || '-'}</td>
                            <td style={tdStyle}>{customer.model || '-'}</td>
                            <td style={tdStyle}>{customer.city || '-'}</td>
                            <td style={{ ...tdStyle, maxWidth: '200px' }}>{customer.address || '-'}</td>
                            <td style={tdStyle}>{customer.pin || '-'}</td>
                            {showActions && (
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    {onEdit && (
                                        <button
                                            onClick={() => onEdit(customer)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', marginRight: '8px' }}
                                        >
                                            ✏️
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={() => window.confirm('Delete "' + customer.cname + '"?') && onDelete(customer.serial)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#dc2626' }}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table >
        </div >
    );
}