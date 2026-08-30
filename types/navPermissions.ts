export interface NavPermissionItem { id: string; label: string; }

export const WC_NAV_ITEMS: NavPermissionItem[] = [
    { id: 'tickets', label: '🎫 Tickets' },
    { id: 'pending', label: '📋 Pending List' },
    { id: 'customers', label: '👥 Customers' },
    { id: 'walkin', label: '🚶 Walk-in' },
    { id: 'walkin-report', label: '📊 Walk-in Report' },
    { id: 'courier', label: '🚚 Courier' },
    { id: 'courier-report', label: '📑 Courier Report' },
    { id: 'reports', label: '📈 Reports' },
    { id: 'inquiries', label: '🔎 Inquiries' },
    { id: 'attendance', label: '🗓️ Attendance' },
    { id: 'work-log', label: '🗒️ Work Log' },
    { id: 'work-log-report', label: '📝 Work Log Report' },
    { id: 'sales', label: '💼 Sales' },
    { id: 'route-planning', label: '🗺️ Route Planning' },
];

// Mirrors HTML's _NAV_ALL_ITEMS (index.html ~11977) restricted to the tabs an
// engineer can actually reach in EngineerDashboard's `EngineerTab` union.
// Ids MUST stay in sync with that union — they are the keys useNavVisibility
// looks up. ('overview' is deliberately absent: it is never hideable.)
export const ENGINEER_NAV_ITEMS: NavPermissionItem[] = [
    { id: 'my-calls', label: '📞 My Calls' },
    { id: 'work-log', label: '🗒️ Work Log' },
    { id: 'my-report', label: '📈 My Reports' },
    { id: 'attendance', label: '🗓️ Attendance' },
    { id: 'km-report', label: '🛣️ KM Tracking' },
    { id: 'payment-collection', label: '💰 Payment Collection' },
    { id: 'inquiries', label: '🔎 Inquiries' },
    { id: 'field-tasks', label: '🚚 Other Work' },
    { id: 'parts-catalog', label: '📚 Parts Catalog' },
    { id: 'fault-finder', label: '🔍 Fault Finder' },
    { id: 'eng-parts', label: '🔩 Eng. Parts' },
    // CSP-manager extras (only reachable when isCspManager(session))
    { id: 'reports', label: '📈 Reports' },
    { id: 'tickets', label: '🎫 All Tickets' },
    { id: 'pending', label: '📋 Pending List' },
    { id: 'route-planning', label: '🗺️ Route Planning' },
    { id: 'customers', label: '👥 Customers' },
    { id: 'inventory', label: '📦 Inventory' },
    { id: 'work-log-report', label: '📝 Work Log Report' },
    { id: 'amc', label: '🛡️ AMC' },
    // Auto-engineer extras (ENG002 / ENG008)
    { id: 'auto-sites', label: '🏢 Auto Sites' },
    { id: 'sw-survey', label: '📝 SW Survey' },
    { id: 'auto-visits-report', label: '📊 Auto Visits Report' },
    { id: 'auto-inventory', label: '📦 Auto Inventory' },
];

export interface NavPermissions {
    users: Record<string, Record<string, boolean>>;
}