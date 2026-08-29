import { useState, useEffect } from 'react';
import { TelegramSettings, defaultTelegramSettings } from '@/types/settings';
import {
    fetchTelegramSettings, saveTelegramToken, saveTelegramAdminChat, saveTelegramOwnerChat,
    saveTelegramEngChat, saveTelegramPreferences, sendTelegramTest, fetchBotContacts,
} from '@/services/settingsService';

export const useTelegramSettings = () => {
    const [settings, setSettings] = useState<TelegramSettings>(defaultTelegramSettings);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try { setSettings(await fetchTelegramSettings()); }
        catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const saveToken = async (token: string) => { await saveTelegramToken(token); await load(); };
    const saveAdminChat = async (chatId: string) => { await saveTelegramAdminChat(chatId); await load(); };
    const saveOwnerChat = async (chatId: string) => { await saveTelegramOwnerChat(chatId); await load(); };
    const saveEngChat = async (engUserId: string, chatId: string) => {
        const next = await saveTelegramEngChat(engUserId, chatId, settings.eng_map);
        setSettings(s => ({ ...s, eng_map: next }));
    };
    const savePreferences = async (prefs: { notify_new_ticket: boolean; notify_punch_in: boolean }) => {
        await saveTelegramPreferences(prefs);
        setSettings(s => ({ ...s, ...prefs }));
    };
    const test = async (chatId: string, label?: string) => sendTelegramTest(settings.bot_token, chatId, label);
    const getBotContacts = async () => fetchBotContacts(settings.bot_token);

    return { settings, setSettings, loading, error, saveToken, saveAdminChat, saveOwnerChat, saveEngChat, savePreferences, test, getBotContacts, refetch: load };
};