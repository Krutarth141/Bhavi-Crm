import { useState, useEffect } from 'react';
import { FaultKnowledge, FaultKnowledgeForm, ModelError } from '@/types/faultFinder';
import { fetchFaultKnowledge, createFaultKnowledge, fetchModelErrors } from '@/services/faultFinderService';

export const useFaultFinder = () => {
    const [faults, setFaults] = useState<FaultKnowledge[]>([]);
    const [errors, setErrors] = useState<ModelError[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAll = async () => {
        try {
            setLoading(true);
            setError(null);
            const [f, e] = await Promise.all([fetchFaultKnowledge(), fetchModelErrors()]);
            setFaults(f);
            setErrors(e);
        } catch (err) {
            setError((err as any).message || 'Failed to load fault data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, []);

    const addFault = async (form: FaultKnowledgeForm) => {
        const result = await createFaultKnowledge(form);
        if (result.success) await loadAll();
        return result;
    };

    return {
        faults,
        errors,
        loading,
        error,
        refetch: loadAll,
        addFault,
    };
};