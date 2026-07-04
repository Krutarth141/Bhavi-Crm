import { useState, useEffect, useCallback } from 'react';
import { PortalService, PortalServiceForm } from '@/types/settings';
import { fetchPortalServices, addPortalService, togglePortalService, deletePortalService } from '@/services/settingsService';

export const usePortalServices = () => {
    const [services, setServices] = useState<PortalService[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchPortalServices();
            setServices(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const add = async (form: PortalServiceForm) => {
        await addPortalService(form);
        await load();
    };

    const toggle = async (id: string, is_active: boolean) => {
        await togglePortalService(id, is_active);
        await load();
    };

    const remove = async (id: string) => {
        await deletePortalService(id);
        await load();
    };

    return { services, loading, error, add, toggle, remove, reload: load };
};