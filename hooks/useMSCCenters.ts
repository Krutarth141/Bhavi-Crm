import { useState, useEffect, useCallback } from 'react';
import { MSCCenter, MSCCenterForm } from '@/types/settings';
import { fetchMSCCenters, addMSCCenter, deleteMSCCenter } from '@/services/settingsService';

export const useMSCCenters = () => {
    const [centers, setCenters] = useState<MSCCenter[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchMSCCenters();
            setCenters(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const add = async (form: MSCCenterForm) => {
        await addMSCCenter(form);
        await load();
    };

    const remove = async (id: number) => {   // number not string
        await deleteMSCCenter(id);
        await load();
    };

    return { centers, loading, error, add, remove, reload: load };
};