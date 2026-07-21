import { useState, useEffect } from 'react';
import { AutoSite, SiteFormData } from '@/types/autoSites';
import { fetchSites, createSite, deleteSite, fetchAllSitePaymentSums, fetchAllSiteItemAggregates } from '@/services/autoSitesService';

export const useAutoSites = () => {
    const [sites, setSites] = useState<AutoSite[]>([]);
    const [payMap, setPayMap] = useState<Record<number, number>>({});
    const [itemMap, setItemMap] = useState<Record<number, { total: number; delivered: number; value: number }>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true); setError(null);
        try {
            const [s, pm, im] = await Promise.all([fetchSites(), fetchAllSitePaymentSums(), fetchAllSiteItemAggregates()]);
            setSites(s); setPayMap(pm); setItemMap(im);
        }
        catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const add = async (form: SiteFormData, createdBy: string) => {
        const r = await createSite(form, createdBy);
        if (r.success) await load();
        return r;
    };

    const remove = async (id: number) => {
        const r = await deleteSite(id);
        if (r.success) await load();
        return r;
    };

    return { sites, payMap, itemMap, loading, error, add, remove, refetch: load };
};