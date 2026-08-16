export const FT_TYPES = ['Cart Delivery', 'Payment Collection', 'Cheque Collection', 'Document Pickup', 'Bank Work', 'Office Work', 'Other'];

export const FT_TYPE_META: Record<string, { emoji: string; color: string }> = {
    'Cart Delivery': { emoji: '🚚', color: '#2563eb' },
    'Payment Collection': { emoji: '💵', color: '#059669' },
    'Cheque Collection': { emoji: '🧾', color: '#7c3aed' },
    'Document Pickup': { emoji: '📄', color: '#0891b2' },
    'Bank Work': { emoji: '🏦', color: '#b45309' },
    'Office Work': { emoji: '🏢', color: '#7c3aed' },
    'Other': { emoji: '🔧', color: '#64748b' },
};

// Suggestions shown only for the "Office Work" type — matches HTML's datalist.
export const FT_OFFICE_WORK_TYPES = [
    'Remote Support', 'Configuration', 'Estimation', 'Documentation',
    'Follow-up Call', 'Billing / Invoice', 'Stock / Inventory', 'Training', 'Other',
];

export type FieldTaskStatus = 'Assigned' | 'Traveling' | 'Reached' | 'Done' | 'Cancelled';

export const FT_STATUS_META: Record<FieldTaskStatus, { emoji: string; color: string }> = {
    Assigned: { emoji: '📋', color: '#d97706' },
    Traveling: { emoji: '🚗', color: '#f59e0b' },
    Reached: { emoji: '📍', color: '#0d9488' },
    Done: { emoji: '✅', color: '#059669' },
    Cancelled: { emoji: '🚫', color: '#6b7280' },
};

export interface FieldTask {
    id: number;
    task_type: string;
    customer_name: string;
    mobile?: string | null;
    amount?: number | null;
    address?: string | null;
    location?: string | null;
    assigned_to?: string | null;
    assigned_name?: string | null;
    notes?: string | null;
    status: FieldTaskStatus;
    task_date?: string;
    created_by?: string;
    created_by_name?: string;
    travel_start_at?: string | null;
    reached_at?: string | null;
    done_at?: string | null;
    done_date?: string | null;
    from_time?: string | null;
    to_time?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface FieldTaskFormData {
    task_type: string;
    customer_name: string;
    mobile: string;
    amount: string;
    address: string;
    location: string;
    assigned_to: string;
    notes: string;
    from_time: string;
    to_time: string;
}

export const emptyFieldTaskForm: FieldTaskFormData = {
    task_type: 'Cart Delivery', customer_name: '', mobile: '', amount: '', address: '', location: '', assigned_to: '', notes: '',
    from_time: '', to_time: '',
};