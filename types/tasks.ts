export interface TimelineEntry {
    action: string;
    by: string;
    at: string;
    note?: string;
}

export interface Task {
    id: string;
    task_no: string;
    title: string;
    description?: string;
    assigned_to: string;
    assigned_name: string;
    priority: 'Low' | 'Normal' | 'High' | 'Urgent';
    status: 'Open' | 'In Progress' | 'On Hold' | 'Closed';
    due_date?: string;
    ticket_id?: string;
    eng_remark?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    timeline?: TimelineEntry[];
}

export interface Engineer {
    eng_id: string;
    name: string;
}

export const PRIORITY_OPTIONS = ['Low', 'Normal', 'High'];
export const STATUS_OPTIONS = ['Open', 'In Progress', 'On Hold', 'Closed'];

export const statusBadges: Record<string, { bg: string; text: string }> = {
    'Open': { bg: '#dbeafe', text: '#1e40af' },
    'In Progress': { bg: '#fef3c7', text: '#92400e' },
    'On Hold': { bg: '#fecaca', text: '#991b1b' },
    'Closed': { bg: '#d1fae5', text: '#065f46' }
};

export const priorityColors: Record<string, string> = {
    'Low': '#10b981',
    'Normal': '#3b82f6',
    'High': '#f59e0b',
    'Urgent': '#ef4444'
};
