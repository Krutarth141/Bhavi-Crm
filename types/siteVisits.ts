export const SV_TYPES = ['Site Visit', 'Survey', 'Maintenance', 'Demo', 'Installation', 'Other'];

export const SV_TYPE_META: Record<string, { emoji: string; color: string }> = {
    'Site Visit': { emoji: '🏗️', color: '#0891b2' },
    'Survey': { emoji: '📋', color: '#7c3aed' },
    'Maintenance': { emoji: '🔧', color: '#ea580c' },
    'Demo': { emoji: '🎯', color: '#059669' },
    'Installation': { emoji: '⚡', color: '#2563eb' },
    'Other': { emoji: '📌', color: '#64748b' },
};

export type SvStatus = 'Assigned' | 'Traveling' | 'Reached' | 'Working' | 'Done' | 'Cancelled';

export const SV_STATUS_META: Record<SvStatus, { emoji: string; color: string }> = {
    Assigned: { emoji: '📋', color: '#d97706' },
    Traveling: { emoji: '🚗', color: '#f59e0b' },
    Reached: { emoji: '📍', color: '#0d9488' },
    Working: { emoji: '🔧', color: '#2563eb' },
    Done: { emoji: '✅', color: '#059669' },
    Cancelled: { emoji: '🚫', color: '#6b7280' },
};

export const SV_STATUS_ORDER: SvStatus[] = ['Assigned', 'Traveling', 'Reached', 'Working', 'Done', 'Cancelled'];

export interface SiteVisit {
    id: number;
    visit_type: string;
    client_name: string;
    site_name?: string | null;
    address?: string | null;
    location?: string | null;
    rooms?: number | null;
    visit_date?: string;
    purpose?: string | null;
    assigned_to?: string | null;
    assigned_name?: string | null;
    notes?: string | null;
    status: SvStatus;
    travel_start_at?: string | null;
    reached_at?: string | null;
    work_start_at?: string | null;
    work_end_at?: string | null;
    done_at?: string | null;
    done_date?: string | null;
    created_by?: string;
    created_by_name?: string;
    created_at?: string;
    updated_at?: string;
}

export interface SiteVisitFormData {
    visit_type: string;
    client_name: string;
    site_name: string;
    address: string;
    location: string;
    rooms: string;
    visit_date: string;
    purpose: string;
    assigned_to: string;
    notes: string;
}

export const emptySiteVisitForm: SiteVisitFormData = {
    visit_type: SV_TYPES[0],
    client_name: '',
    site_name: '',
    address: '',
    location: '',
    rooms: '',
    visit_date: new Date().toLocaleDateString('en-CA'),
    purpose: '',
    assigned_to: '',
    notes: '',
};