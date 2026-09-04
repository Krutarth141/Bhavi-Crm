import { useState, useEffect } from 'react';
import { FaultKnowledge, FaultKnowledgeForm } from '@/types/faultFinder';
import { fetchFaultKnowledge, createFaultKnowledge, updateFaultKnowledge, deleteFaultKnowledge, fetchTicketModels } from '@/services/faultFinderService';

export const useFaultFinder = () => {
    const [faults, setFaults] = useState<FaultKnowledge[]>([]);
    const [ticketModels, setTicketModels] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAll = async () => {
        try {
            setLoading(true);
            setError(null);
            const [f, tm] = await Promise.all([fetchFaultKnowledge(), fetchTicketModels()]);
            setFaults(f);
            setTicketModels(tm);
        } catch (err) {
            setError((err as any).message || 'Failed to load fault data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, []);

    const addFault = async (form: FaultKnowledgeForm, byUser?: string) => {
        const result = await createFaultKnowledge(form, byUser);
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
        ticketModels,
        loading,
        error,
        refetch: loadAll,
        addFault,
        editFault,
        removeFault,
    };
};