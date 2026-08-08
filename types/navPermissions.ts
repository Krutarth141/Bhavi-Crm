export interface NavPermissionItem { id: string; label: string; }

export const WC_NAV_ITEMS: NavPermissionItem[] = [
    { id: 'tickets', label: '🎫 Tickets' },
    { id: 'pending', label: '📋 Pending List' },
    { id: 'tasks', label: '✅ Tasks' },
    { id: 'customers', label: '👥 Customers' },
    { id: 'walkin', label: '🚶 Walk-in' },
    { id: 'walkin-report', label: '📊 Walk-in Report' },
    { id: 'courier', label: '🚚 Courier' },
    { id: 'courier-report', label: '📑 Courier Report' },
    { id: 'reports', label: '📈 Reports' },
    { id: 'inquiries', label: '🔎 Inquiries' },
    { id: 'attendance', label: '🗓️ Attendance' },
];

export const ENGINEER_NAV_ITEMS: NavPermissionItem[] = [
    { id: 'my-calls', label: '📞 My Calls' },
    { id: 'tasks', label: '📋 My Tasks' },
    { id: 'tickets', label: '🎫 My Tickets' },
    { id: 'eng-parts', label: '🔩 Eng. Parts' },
    { id: 'reports', label: '📈 My Reports' },
    { id: 'attendance', label: '🗓️ Attendance' },
    { id: 'engineer-update', label: '🛠️ Engineer Update' },
];

export interface NavPermissions {
    users: Record<string, Record<string, boolean>>;
}