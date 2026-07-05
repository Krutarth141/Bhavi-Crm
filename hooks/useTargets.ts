import { useState, useEffect } from 'react';
import { EngineerTarget, currentMonth } from '@/types/targets';
import { fetchTargets, upsertTarget, deleteTarget, fetchActualPerformance } from '@/services/targetsService';

export const useTargets = () => {
    const [targets, setTargets] = useState<EngineerTarget[]>([]);
    const [actual, setActual] = useState<Record<string, { calls: number; revenue: number }>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [month, setMonth] = useState(currentMonth());

    const load = async (m: string) => {
        setLoading(true); setError(null);
        try {
            const [t, a] = await Promise.all([fetchTargets(m), fetchActualPerformance(m)]);
            setTargets(t); setActual(a);
        } catch (err) { setError((err as any).message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(month); }, [month]);

    const save = async (form: Parameters<typeof upsertTarget>[0]) => {
        const r = await upsertTarget(form);
        if (r.success) await load(month);
        return r;
    };

    const remove = async (id: number) => {
        const r = await deleteTarget(id);
        if (r.success) await load(month);
        return r;
    };

    return { targets, actual, loading, error, month, setMonth, save, remove, reload: () => load(month) };
};