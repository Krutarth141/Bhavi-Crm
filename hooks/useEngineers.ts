import { useState, useEffect } from 'react';

interface Engineer {
    id: string;
    user_id: string;
    name: string;
    role_type: string;
}

export const useEngineers = () => {
    const [engineers, setEngineers] = useState<Engineer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEngineers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/admin/engineers', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies for session
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData.error,
                });
                throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            setEngineers(data.engineers || []);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMsg);
            console.error('Failed to fetch engineers:', errorMsg);
            setEngineers([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEngineers();
    }, []);

    return { engineers, loading, error, fetchEngineers };
};
