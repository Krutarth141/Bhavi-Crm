import { useState, useEffect } from 'react';
import { AMCContract, AMCFormData, isExpired, isExpiringSoon, todayStr } from '@/types/amc';
import { fetchAMCContracts, createAMCContract, updateAMCContract, deleteAMCContract } from '@/services/amcService';

export const useAMC = () => {
    const [contracts, setContracts] = useState<AMCContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadContracts = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchAMCContracts();
            setContracts(data);
        } catch (err) {
            setError((err as any).message || 'Failed to load AMC contracts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadContracts(); }, []);

    const create = async (form: AMCFormData, createdBy: string) => {
        const result = await createAMCContract(form, createdBy);
        if (result.success) await loadContracts();
        return result;
    };

    const update = async (id: number, form: AMCFormData) => {
        const result = await updateAMCContract(id, form);
        if (result.success) await loadContracts();
        return result;
    };

    const remove = async (id: number) => {
        const result = await deleteAMCContract(id);
        if (result.success) await loadContracts();
        return result;
    };

    // Derived stats
    // Derived stats — matches HTML's summary tile: Active = amc_end >= today
    // (inclusive of expiring-soon contracts; per-card badges use the
    // mutually-exclusive isExpired/isExpiringSoon logic separately).
    const active = contracts.filter(c => !!c.amc_end && c.amc_end >= todayStr()).length;
    const expiring = contracts.filter(c => isExpiringSoon(c.amc_end)).length;
    const expired = contracts.filter(c => isExpired(c.amc_end)).length;
    const revenue = contracts.reduce((s, c) => s + (c.amc_amount || 0), 0);

    return {
        contracts,
        loading,
        error,
        active,
        expiring,
        expired,
        revenue,
        refetch: loadContracts,
        create,
        update,
        remove,
    };
};