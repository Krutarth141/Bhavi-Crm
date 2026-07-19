// ─── Shift Settings ───────────────────────────────────────────────────────────
// Table: shift_settings (id=1, single row)

// ─── Shift Settings ───────────────────────────────────────────────────────────
// Table: shift_settings — one row per employee (emp_id is the key), matching
// the HTML app's schema. Replaces the earlier single-global-row model.

export interface EmployeeShift {
    emp_id: string;
    emp_name?: string;
    emp_role?: string;
    shift_start: string;   // e.g. "09:30"
    shift_end: string;     // e.g. "18:30"
    weekly_off: string;    // 'Sunday' | 'Saturday' | 'Sunday,Saturday' | 'None'
    updated_at?: string;
}

export const WEEKLY_OFF_OPTIONS = ['Sunday', 'Saturday', 'Sunday,Saturday', 'None'];

export const DEFAULT_SHIFT = { shift_start: '09:30', shift_end: '18:30', weekly_off: 'Sunday' };

// ─── MSC Centers ──────────────────────────────────────────────────────────────
// Table: auto_msc_centers

export interface MSCCenter {
    id: number;           // bigint (not uuid)
    name: string;         // was msc_name
    city?: string;
    contact?: string;     // was contact_person
    address?: string;
    created_at?: string;
}

export interface MSCCenterForm {
    name: string;         // was msc_name
    city: string;
    contact: string;      // was contact_person
    address: string;
}

export const emptyMSCCenterForm: MSCCenterForm = {
    name: '', city: '', contact: '', address: '',
};
// ─── Portal Services ──────────────────────────────────────────────────────────
// Table: portal_services
// types/settings.ts ma replace karvu — PortalService interface

export interface PortalService {
    id: string;
    name: string;
    icon?: string;
    price_display?: string;
    price_amount?: number;
    service_type?: string;    // e.g. 'carry_in', 'on_site'
    repair_cat?: string;      // repair category
    inquiry_type?: string;
    subtitle?: string;
    includes?: any[];         // jsonb
    form_fields?: any[];      // jsonb
    sort_order?: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PortalServiceForm {
    name: string;
    icon: string;
    price_display: string;
    price_amount: string;
    service_type: string;
    repair_cat: string;
    subtitle: string;
    sort_order: string;
}

export const emptyPortalServiceForm: PortalServiceForm = {
    name: '', icon: '', price_display: '', price_amount: '',
    service_type: '', repair_cat: '', subtitle: '', sort_order: '',
};

export const SERVICE_TYPES = ['carry_in', 'on_site', 'both'];
export const REPAIR_CATS = ['camera', 'printer', 'electronics', 'automation', 'other'];

// ─── Telegram Settings ────────────────────────────────────────────────────────
// Table: telegram_settings (id=1, single row)

export interface TelegramSettings {
    id?: number;
    bot_token: string;
    chat_id: string;
    notify_new_ticket: boolean;
    notify_status_change: boolean;
    notify_punch_in: boolean;
    updated_at?: string;
}

export const defaultTelegramSettings: TelegramSettings = {
    bot_token: '',
    chat_id: '',
    notify_new_ticket: true,
    notify_status_change: true,
    notify_punch_in: false,
};