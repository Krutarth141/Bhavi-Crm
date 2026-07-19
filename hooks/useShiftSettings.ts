import { useState } from 'react';
import { EmployeeShift } from '@/types/settings';
import { fetchEmployeesWithShifts, saveEmployeeShift } from '@/services/settingsService';

export const useShiftSettings = () => {
    const [shifts, setShifts] = useState<EmployeeShift[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true); setError(null);
        try {
            setShifts(await fetchEmployeesWithShifts());
            setLoaded(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const updateShift = (empId: string, patch: Partial<EmployeeShift>) => {
        setShifts(rows => rows.map(r => r.emp_id === empId ? { ...r, ...patch } : r));
    };

    const saveShift = async (empId: string): Promise<{ success: boolean; error?: string }> => {
        const row = shifts.find(r => r.emp_id === empId);
        if (!row) return { success: false, error: 'Employee not found' };
        setSavingId(empId);
        try {
            await saveEmployeeShift(row);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        } finally {
            setSavingId(null);
        }
    };

    return { shifts, loaded, loading, savingId, error, load, updateShift, saveShift };
};