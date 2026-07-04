import { useState, useEffect, useCallback } from 'react';

export interface Engineer {
    id: string;
    user_id: string;
    name: string;
    role: string;
    role_type: string;
    initials?: string;
    eng_id?: string;
    eng_type?: 'carryin' | 'onsite';        // HTML CRM field name
    require_meter_photo?: boolean;
    is_active: boolean;
    created_at?: string;
}

export interface EngineerFormData {
    user_id: string;
    name: string;
    initials: string;
    password: string;
    eng_type: 'carryin' | 'onsite';
    require_meter_photo: boolean;
    is_active: boolean;
}

export const useEngineers = () => {
    const [engineers, setEngineers] = useState<Engineer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadEngineers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/admin/engineers', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API Error: ${response.status}`);
            }
            const data = await response.json();
            setEngineers(data.engineers || []);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMsg);
            setEngineers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadEngineers(); }, [loadEngineers]);

    const createEngineer = async (form: EngineerFormData): Promise<void> => {
        const res = await fetch('/api/admin/engineers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(form),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create'); }
        await loadEngineers();
    };

    const updateEngineer = async (id: string, form: Partial<EngineerFormData>): Promise<void> => {
        const res = await fetch(`/api/admin/engineers/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(form),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update'); }
        await loadEngineers();
    };

    const toggleActive = async (id: string, is_active: boolean): Promise<void> => {
        await updateEngineer(id, { is_active });
    };

    const deleteEngineer = async (id: string): Promise<void> => {
        const res = await fetch(`/api/admin/engineers/${id}`, {
            method: 'DELETE', credentials: 'include',
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to delete'); }
        await loadEngineers();
    };

    const activeEngineers = engineers.filter(e => e.is_active);
    const inactiveEngineers = engineers.filter(e => !e.is_active);

    return {
        engineers, activeEngineers, inactiveEngineers,
        loading, error, loadEngineers,
        createEngineer, updateEngineer, toggleActive, deleteEngineer,
    };
};