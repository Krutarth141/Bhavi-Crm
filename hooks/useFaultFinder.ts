import { useState, useEffect } from 'react';
import { FaultKnowledge, FaultKnowledgeForm, ModelError } from '@/types/faultFinder';
import { fetchFaultKnowledge, createFaultKnowledge, fetchModelErrors, updateFaultKnowledge, deleteFaultKnowledge, fetchTicketModels } from '@/services/faultFinderService';

export const useFaultFinder = () => {
    const [faults, setFaults] = useState<FaultKnowledge[]>([]);
    const [errors, setErrors] = useState<ModelError[]>([]);
    const [ticketModels, setTicketModels] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAll = async () => {
        try {
            setLoading(true);
            setError(null);
            const [f, e, tm] = await Promise.all([fetchFaultKnowledge(), fetchModelErrors(), fetchTicketModels()]);
            setFaults(f);
            setErrors(e);
            setTicketModels(tm);
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

    const editFault = async (id: string, form: FaultKnowledgeForm) => {
        const result = await updateFaultKnowledge(id, form);
        if (result.success) await loadAll();
        return result;
    };

    const removeFault = async (id: string) => {
        const result = await deleteFaultKnowledge(id);
        if (result.success) await loadAll();
        return result;
    };

    return {
        faults,
        errors,
        ticketModels,
        loading,
        error,
        refetch: loadAll,
        addFault,
        editFault,
        removeFault,
    };
};