import { supabase } from '@/lib/supabase';
import {
    ShiftSettings,
    MSCCenter, MSCCenterForm,
    PortalService, PortalServiceForm,
    TelegramSettings,
} from '@/types/settings';

// ─── Shift Settings ───────────────────────────────────────────────────────────

export const fetchShiftSettings = async (): Promise<ShiftSettings | null> => {
    const { data, error } = await supabase
        .from('shift_settings')
        .select('*')
        .eq('id', 1)
        .single();
    if (error) return null;
    return data;
};

export const saveShiftSettings = async (settings: ShiftSettings): Promise<void> => {
    const { error } = await supabase
        .from('shift_settings')
        .upsert([{ id: 1, ...settings, updated_at: new Date().toISOString() }]);
    if (error) throw error;
};

// ─── MSC Centers ──────────────────────────────────────────────────────────────

export const fetchMSCCenters = async (): Promise<MSCCenter[]> => {
    const { data, error } = await supabase
        .from('auto_msc_centers')
        .select('id, name, city, contact, address, created_at')
        .order('name');
    if (error) throw error;
    return data || [];
};

export const addMSCCenter = async (form: MSCCenterForm): Promise<void> => {
    const { error } = await supabase
        .from('auto_msc_centers')
        .insert([{
            name: form.name.trim(),
            city: form.city.trim() || null,
            contact: form.contact.trim() || null,
            address: form.address.trim() || null,
        }]);
    if (error) throw error;
};

export const deleteMSCCenter = async (id: number): Promise<void> => {  // number not string
    const { error } = await supabase
        .from('auto_msc_centers')
        .delete()
        .eq('id', id);
    if (error) throw error;
};


// ─── Portal Services ──────────────────────────────────────────────────────────

// Replace fetchPortalServices, addPortalService, togglePortalService, deletePortalService
// in services/settingsService.ts with these corrected versions:

export const fetchPortalServices = async (): Promise<PortalService[]> => {
    const { data, error } = await supabase
        .from('portal_services')
        .select('id, name, icon, price_display, price_amount, service_type, repair_cat, subtitle, sort_order, is_active')
        .order('sort_order', { ascending: true })
        .order('name');
    if (error) throw error;
    return data || [];
};

export const addPortalService = async (form: PortalServiceForm): Promise<void> => {
    const { error } = await supabase
        .from('portal_services')
        .insert([{
            name: form.name.trim(),
            icon: form.icon.trim() || null,
            price_display: form.price_display.trim() || null,
            price_amount: form.price_amount ? Number(form.price_amount) : null,
            service_type: form.service_type || null,
            repair_cat: form.repair_cat || null,
            subtitle: form.subtitle.trim() || null,
            sort_order: form.sort_order ? Number(form.sort_order) : null,
            is_active: true,
            updated_at: new Date().toISOString(),
        }]);
    if (error) throw error;
};

export const togglePortalService = async (id: string, is_active: boolean): Promise<void> => {
    const { error } = await supabase
        .from('portal_services')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw error;
};

export const deletePortalService = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('portal_services')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// ─── Telegram Settings ────────────────────────────────────────────────────────

export const fetchTelegramSettings = async (): Promise<TelegramSettings | null> => {
    const { data, error } = await supabase
        .from('telegram_settings')
        .select('*')
        .eq('id', 1)
        .single();
    if (error) return null;
    return data;
};

export const saveTelegramSettings = async (settings: TelegramSettings): Promise<void> => {
    const { error } = await supabase
        .from('telegram_settings')
        .upsert([{ id: 1, ...settings, updated_at: new Date().toISOString() }]);
    if (error) throw error;
};

export const sendTelegramTest = async (botToken: string, chatId: string): Promise<void> => {
    const res = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: '✅ Bhavi CRM — Telegram notification test successful!',
            }),
        }
    );
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Telegram error');
};