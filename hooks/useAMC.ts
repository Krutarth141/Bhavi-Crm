import { useState, useEffect } from 'react';
import { AMCContract, AMCFormData, isExpired, isExpiringSoon } from '@/types/amc';
import { fetchAMCContracts, createAMCContract, deleteAMCContract } from '@/services/amcService';

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

    const remove = async (id: number) => {
        const result = await deleteAMCContract(id);
        if (result.success) await loadContracts();
        return result;
    };

    // Derived stats
    const active = contracts.filter(c => !isExpired(c.amc_end) && !isExpiringSoon(c.amc_end)).length;
    const expiring = contracts.filter(c => isExpiringSoon(c.amc_end)).length;
    const expired = contracts.filter(c => isExpired(c.amc_end)).length;

    return {
        contracts,
        loading,
        error,
        active,
        expiring,
        expired,
        refetch: loadContracts,
        create,
        remove,
    };
};