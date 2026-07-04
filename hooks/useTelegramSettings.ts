import { useState, useEffect } from 'react';
import { TelegramSettings, defaultTelegramSettings } from '@/types/settings';
import { fetchTelegramSettings, saveTelegramSettings, sendTelegramTest } from '@/services/settingsService';

export const useTelegramSettings = () => {
    const [settings, setSettings] = useState<TelegramSettings>(defaultTelegramSettings);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const data = await fetchTelegramSettings();
            if (data) setSettings({
                bot_token: data.bot_token || '',
                chat_id: data.chat_id || '',
                notify_new_ticket: data.notify_new_ticket ?? true,
                notify_status_change: data.notify_status_change ?? true,
                notify_punch_in: data.notify_punch_in ?? false,
            });
        };
        load();
    }, []);

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await saveTelegramSettings(settings);
        } catch (e: any) {
            setError(e.message);
            throw e;
        } finally {
            setSaving(false);
        }
    };

    const test = async () => {
        setTesting(true);
        setError(null);
        try {
            await sendTelegramTest(settings.bot_token, settings.chat_id);
        } catch (e: any) {
            setError(e.message);
            throw e;
        } finally {
            setTesting(false);
        }
    };

    return { settings, setSettings, saving, testing, error, save, test };
};