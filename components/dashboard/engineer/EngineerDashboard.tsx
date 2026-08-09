'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useNavVisibility } from '@/hooks/useNavVisibility';

// Existing screens
import TasksScreen from '@/components/screens/TasksScreen';
import TicketsScreen from '@/components/screens/TicketsScreen';
import MyReportScreen from '@/components/screens/MyReportScreen';

// New screens
import MyCallsScreen from '@/components/screens/MyCallsScreen';
import EngPartsScreen from '@/components/screens/EngPartsScreen';
import EngineerUpdateScreen from '@/components/screens/EngineerUpdateScreen';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import { isCspManager } from '@/lib/permissions';
import AttendanceScreen from '@/components/screens/AttendanceScreen';
import ReportsScreen from '@/components/screens/ReportsScreen';
import PendingListScreen from '@/components/screens/PendingListScreen';
import CustomersScreen from '@/components/screens/CustomersScreen';
import RoutePlanningScreen from '@/components/screens/RoutePlanningScreen';
import InventoryScreen from '@/components/screens/InventoryScreen';
import AMCScreen from '@/components/screens/AMCScreen';
import WorkLogScreen from '@/components/screens/WorkLogScreen';
import KmTrackingScreen from '@/components/screens/KmTrackingScreen';

type EngineerTab = 'overview' | 'my-calls' | 'tasks' | 'tickets' | 'eng-parts' | 'reports' | 'attendance' | 'engineer-update'
    | 'pending' | 'route-planning' | 'customers' | 'inventory' | 'amc' | 'work-log-report' | 'km-report';

const NAV_ITEMS: { id: EngineerTab; label: string }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'my-calls', label: '📞 My Calls' },
    { id: 'tasks', label: '📋 My Tasks' },
    { id: 'tickets', label: '🎫 My Tickets' },
    { id: 'eng-parts', label: '🔩 Eng. Parts' },
    { id: 'reports', label: '📈 My Reports' },
    { id: 'attendance', label: '🗓️ Attendance' },
    { id: 'engineer-update', label: '🛠️ Engineer Update' },
    { id: 'km-report', label: '🛣️ KM Tracking' },
];

// CSP Manager (ENG001) only — mirrors HTML's isCspMgr nav extras.
const CSP_EXTRA_ITEMS: { id: EngineerTab; label: string }[] = [
    { id: 'pending', label: '📋 Pending List' },
    { id: 'route-planning', label: '🗺️ Route Planning' },
    { id: 'customers', label: '👥 Customers' },
    { id: 'inventory', label: '📦 Inventory' },
    { id: 'work-log-report', label: '📝 Work Log Report' },
    { id: 'amc', label: '🛡️ AMC' },
];

export default function EngineerDashboard() {
    const { data: session } = useSession();
    const cspMgr = isCspManager(session);
    const uid = (session?.user as any)?.id != null ? String((session?.user as any).id) : undefined;
    const { isVisible } = useNavVisibility(uid);
    const allNavItems = cspMgr ? [...NAV_ITEMS, ...CSP_EXTRA_ITEMS] : NAV_ITEMS;
    const visibleNavItems = allNavItems.filter((item) => item.id === 'overview' || isVisible(item.id));

    const [activeTab, setActiveTab] = useState<EngineerTab>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleNavClick = (id: EngineerTab) => {
        setActiveTab(id);
        setSidebarOpen(false);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <DashboardOverview role="engineer" />;
            case 'my-calls': return <MyCallsScreen />;
            case 'tasks': return <TasksScreen />;
            case 'tickets': return <TicketsScreen />;
            case 'eng-parts': return <EngPartsScreen />;
            case 'reports': return cspMgr ? <ReportsScreen /> : <MyReportScreen />;
            case 'attendance': return <AttendanceScreen />;
            case 'engineer-update': return <EngineerUpdateScreen />;
            case 'km-report': return <KmTrackingScreen />;
            case 'pending': return cspMgr ? <PendingListScreen /> : null;
            case 'route-planning': return cspMgr ? <RoutePlanningScreen /> : null;
            case 'customers': return cspMgr ? <CustomersScreen /> : null;
            case 'inventory': return cspMgr ? <InventoryScreen /> : null;
            case 'amc': return cspMgr ? <AMCScreen /> : null;
            case 'work-log-report': return cspMgr ? <WorkLogScreen /> : null;
            default: return null;
        }
    };

    return (
        <div className="engineer-dashboard">

            {/* Overlay */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 998 }}
                />
            )}

            {/* Sidebar */}
            <div className={`dashboard-sidebar${sidebarOpen ? ' open' : ''}`}>
                <nav className="dashboard-nav">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 8px' }}>
                        <h2 style={{ margin: 0 }}>Engineer Menu</h2>
                        <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
                    </div>
                    <ul>
                        {visibleNavItems.map(item => (
                            <li key={item.id}>
                                <button
                                    className={activeTab === item.id ? 'active' : ''}
                                    onClick={() => handleNavClick(item.id)}
                                >
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Mobile top bar */}
                <div className="mobile-topbar">
                    <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
                        <span /><span /><span />
                    </button>
                    <span className="mobile-topbar-title">
                        {allNavItems.find(n => n.id === activeTab)?.label}
                    </span>
                </div>
                <div className="dashboard-content">
                    {renderContent()}
                </div>
            </div>

        </div>
    );
}