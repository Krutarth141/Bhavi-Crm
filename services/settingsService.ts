import { supabase } from '@/lib/supabase';
import {
    EmployeeShift, DEFAULT_SHIFT,
    MSCCenter, MSCCenterForm,
    PortalService, PortalServiceForm,
    TelegramSettings, defaultTelegramSettings
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

const tgGet = async (key: string): Promise<string | null> => {
    const { data, error } = await supabase.from('telegram_settings').select('value').eq('key', key).maybeSingle();
    if (error || !data) return null;
    return data.value;
};

const tgSet = async (key: string, value: string): Promise<void> => {
    const { data: existing } = await supabase.from('telegram_settings').select('key').eq('key', key);
    if (existing && existing.length) {
        const { error } = await supabase.from('telegram_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('telegram_settings').insert([{ key, value, updated_at: new Date().toISOString() }]);
        if (error) throw error;
    }
};

export const fetchTelegramSettings = async (): Promise<TelegramSettings> => {
    try {
        const { data, error } = await supabase.from('telegram_settings').select('key, value');
        if (error) throw error;
        const map: Record<string, string> = {};
        (data || []).forEach((r: any) => { map[r.key] = r.value; });
        let engMap: Record<string, string> = {};
        if (map['tg_eng_map']) { try { engMap = JSON.parse(map['tg_eng_map']); } catch { engMap = {}; } }
        return {
            bot_token: map['tg_bot_token'] || '',
            admin_chat: map['tg_admin_chat'] || '',
            owner_chat: map['tg_owner_chat'] || '',
            eng_map: engMap,
            notify_new_ticket: map['tg_notify_new_ticket'] !== undefined ? map['tg_notify_new_ticket'] === 'true' : true,
            notify_status_change: map['tg_notify_status_change'] !== undefined ? map['tg_notify_status_change'] === 'true' : true,
            notify_punch_in: map['tg_notify_punch_in'] === 'true',
        };
    } catch (err) { console.error('fetchTelegramSettings:', err); return defaultTelegramSettings; }
};

export const saveTelegramToken = async (token: string): Promise<void> => tgSet('tg_bot_token', token.trim());
export const saveTelegramAdminChat = async (chatId: string): Promise<void> => tgSet('tg_admin_chat', chatId.trim());
export const saveTelegramOwnerChat = async (chatId: string): Promise<void> => tgSet('tg_owner_chat', chatId.trim());

export const saveTelegramEngChat = async (engUserId: string, chatId: string, currentMap: Record<string, string>): Promise<Record<string, string>> => {
    const next = { ...currentMap };
    if (chatId.trim()) next[engUserId] = chatId.trim(); else delete next[engUserId];
    await tgSet('tg_eng_map', JSON.stringify(next));
    return next;
};

export const saveTelegramPreferences = async (prefs: { notify_new_ticket: boolean; notify_status_change: boolean; notify_punch_in: boolean }): Promise<void> => {
    await Promise.all([
        tgSet('tg_notify_new_ticket', String(prefs.notify_new_ticket)),
        tgSet('tg_notify_status_change', String(prefs.notify_status_change)),
        tgSet('tg_notify_punch_in', String(prefs.notify_punch_in)),
    ]);
};

export const sendTelegramTest = async (botToken: string, chatId: string, label?: string): Promise<void> => {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: `✅ Test from Bhavi CRM\n\nBot connected! – ${label || 'Test'}` }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Telegram error');
};

export const fetchBotContacts = async (botToken: string): Promise<{ id: string; name: string; username: string }[]> => {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100&timeout=0`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.description || 'Telegram error');
    const seen: Record<string, boolean> = {};
    const contacts: { id: string; name: string; username: string }[] = [];
    (json.result || []).forEach((u: any) => {
        const chat = (u.message?.chat) || (u.callback_query?.message?.chat) || (u.my_chat_member?.chat) || {};
        if (!chat.id || chat.type !== 'private' || seen[chat.id]) return;
        seen[chat.id] = true;
        contacts.push({ id: String(chat.id), name: [chat.first_name, chat.last_name].filter(Boolean).join(' '), username: chat.username || '' });
    });
    return contacts;
};

export const sendDailyTelegramReport = async (): Promise<void> => {
    const s = await fetchTelegramSettings();
    if (!s.admin_chat) throw new Error('Admin Chat ID not set');
    if (!s.bot_token) throw new Error('Bot Token not set');
    const today = new Date().toLocaleDateString('en-CA');
    const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const [ticketsRes, inquiriesRes, walkinsRes] = await Promise.all([
        supabase.from('tickets').select('id, status, assigned_name, cname').gte('created_at', `${today}T00:00:00`),
        supabase.from('auto_inquiries').select('id, status, assigned_name, inquiry_type').gte('created_at', `${today}T00:00:00`),
        supabase.from('walkin_log').select('id, products').eq('visit_date', today),
    ]);
    const tickets = ticketsRes.data || [];
    const inquiries = inquiriesRes.data || [];
    const walkins = walkinsRes.data || [];
    const engMap: Record<string, { total: number; closed: number }> = {};
    tickets.forEach((t: any) => {
        const en = t.assigned_name || 'Unassigned';
        if (!engMap[en]) engMap[en] = { total: 0, closed: 0 };
        engMap[en].total++;
        if (t.status === 'Closed' || t.status === 'Delivered') engMap[en].closed++;
    });
    const engLines = Object.entries(engMap).map(([n, v]) => `  👷 ${n}: ${v.total} tickets (${v.closed} closed)`).join('\n');
    let wiProds = 0;
    walkins.forEach((w: any) => {
        let p = w.products || [];
        if (typeof p === 'string') { try { p = JSON.parse(p); } catch { p = []; } }
        wiProds += p.length;
    });
    const inqOpen = inquiries.filter((i: any) => i.status === 'Open' || i.status === 'In Progress').length;
    const inqWon = inquiries.filter((i: any) => i.status === 'Converted').length;
    const msg = `📊 <b>Daily Report — ${dateLabel}</b>\n\n`
        + `🎫 <b>Tickets Today: ${tickets.length}</b>\n${engLines || '  No tickets'}\n\n`
        + `🔔 <b>Inquiries Today: ${inquiries.length}</b>\n`
        + `  Open/In Progress: ${inqOpen}\n`
        + `  Converted (Won): ${inqWon}\n\n`
        + `🚶 <b>Walk-ins: ${walkins.length} customers | ${wiProds} products</b>`;
    const res = await fetch(`https://api.telegram.org/bot${s.bot_token}/sendMessage?chat_id=${encodeURIComponent(s.admin_chat)}&text=${encodeURIComponent(msg)}&parse_mode=HTML`);
    if (!res.ok) throw new Error('Failed to send report');
};