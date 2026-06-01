import { useState, useEffect } from 'react';
import { Customer } from '@/types/customers';
import { fetchAllCustomers } from '@/services/customerService';

export const useCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchAllCustomers();
            setCustomers(data);
        } catch (err) {
            const message = (err as any).message || 'Failed to load customers';
            setError(message);
            console.error('Error loading customers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
    }, []);

    return {
        customers,
        setCustomers,
        loading,
        error,
        refetch: loadCustomers
    };
};
