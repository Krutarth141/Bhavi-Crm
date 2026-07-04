import { useState } from 'react';
import { ShiftSettings, defaultShiftSettings } from '@/types/settings';
import { fetchShiftSettings, saveShiftSettings } from '@/services/settingsService';

export const useShiftSettings = () => {
    const [settings, setSettings] = useState<ShiftSettings>(defaultShiftSettings);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        try {
            const data = await fetchShiftSettings();
            if (data) setSettings(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoaded(true);
        }
    };

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await saveShiftSettings(settings);
        } catch (e: any) {
            setError(e.message);
            throw e;
        } finally {
            setSaving(false);
        }
    };

    return { settings, setSettings, loaded, saving, error, load, save };
};