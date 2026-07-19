import { supabase } from '@/lib/supabase';
import {
    EmployeeShift, DEFAULT_SHIFT,
    MSCCenter, MSCCenterForm,
    PortalService, PortalServiceForm,
    TelegramSettings,
} from '@/types/settings';
import { CompanyInfo } from '@/types/companyInfo';

export const fetchCompanyInfo = async (): Promise<CompanyInfo | null> => {
    try {
        const { data, error } = await supabase.from('company_info').select('*').single();
        if (error) return null;
        return data;
    } catch {
        return null;
    }
};

export const saveCompanyInfo = async (info: Partial<CompanyInfo>): Promise<void> => {
    const { error } = await supabase.from('company_info').upsert([{ id: 1, ...info }]);
    if (error) throw error;
};
// ─── Shift Settings (per-employee) ────────────────────────────────────────────

export const fetchEmployeesWithShifts = async (): Promise<EmployeeShift[]> => {
    const [usersRes, shiftsRes] = await Promise.all([
        supabase.from('users').select('user_id, name, role').eq('is_active', true).order('name'),
        supabase.from('shift_settings').select('*').order('emp_id'),
    ]);
    if (usersRes.error) throw usersRes.error;

    const shiftMap: Record<string, any> = {};
    (shiftsRes.data || []).forEach((s: any) => { shiftMap[s.emp_id] = s; });

    return (usersRes.data || []).map((u: any) => {
        const s = shiftMap[u.user_id];
        return {
            emp_id: u.user_id,
            emp_name: u.name,
            emp_role: u.role,
            shift_start: s?.shift_start || DEFAULT_SHIFT.shift_start,
            shift_end: s?.shift_end || DEFAULT_SHIFT.shift_end,
            weekly_off: s?.weekly_off || DEFAULT_SHIFT.weekly_off,
        };
    });
};

export const saveEmployeeShift = async (shift: EmployeeShift): Promise<void> => {
    const { data: existing } = await supabase.from('shift_settings').select('emp_id').eq('emp_id', shift.emp_id);
    const payload = {
        shift_start: shift.shift_start,
        shift_end: shift.shift_end,
        weekly_off: shift.weekly_off,
        updated_at: new Date().toISOString(),
    };
    if (existing && existing.length > 0) {
        const { error } = await supabase.from('shift_settings').update(payload).eq('emp_id', shift.emp_id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('shift_settings').insert([{ emp_id: shift.emp_id, emp_name: shift.emp_name, emp_role: shift.emp_role, ...payload }]);
        if (error) throw error;
    }
};

// Used by attendance computations (next step): shift lookup keyed by emp_id.
export const fetchShiftMap = async (): Promise<Record<string, EmployeeShift>> => {
    const { data } = await supabase.from('shift_settings').select('*');
    const map: Record<string, EmployeeShift> = {};
    (data || []).forEach((s: any) => { map[s.emp_id] = s; });
    return map;
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