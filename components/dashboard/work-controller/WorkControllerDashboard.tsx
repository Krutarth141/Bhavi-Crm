'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useNavVisibility } from '@/hooks/useNavVisibility';

// Existing screens
import TicketsScreen from '@/components/screens/TicketsScreen';
import TasksScreen from '@/components/screens/TasksScreen';
import CustomersScreen from '@/components/screens/CustomersScreen';
import ReportsScreen from '@/components/screens/ReportsScreen';

// New screens
import WalkInScreen from '@/components/screens/WalkInScreen';
import WalkInReportScreen from '@/components/screens/WalkInReportScreen';
import CourierScreen from '@/components/screens/CourierScreen';
import CourierReportScreen from '@/components/screens/CourierReportScreen';
import PendingListScreen from '@/components/screens/PendingListScreen';
import InquiriesScreen from '@/components/screens/InquiriesScreen';
import AttendanceScreen from '@/components/screens/AttendanceScreen';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import WCDailyReportModal from '@/components/screens/WCDailyReportModal';

type WorkControllerTab =
    | 'overview' | 'tickets' | 'pending' | 'tasks' | 'customers'
    | 'walkin' | 'walkin-report' | 'courier' | 'courier-report'
    | 'reports' | 'inquiries' | 'attendance';

const NAV_ITEMS: { id: WorkControllerTab; label: string }[] = [
    { id: 'overview', label: '📊 Overview' },
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

export default function WorkControllerDashboard() {
    const { data: session } = useSession();
    const uid = (session?.user as any)?.id != null ? String((session?.user as any).id) : undefined;
    const { isVisible } = useNavVisibility(uid);
    const visibleNavItems = NAV_ITEMS.filter((item) => item.id === 'overview' || isVisible(item.id));

    const [activeTab, setActiveTab] = useState<WorkControllerTab>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showWCReport, setShowWCReport] = useState(false);

    const handleNavClick = (id: WorkControllerTab) => {
        setActiveTab(id);
        setSidebarOpen(false);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <DashboardOverview role="work_controller" />;
            case 'tickets': return <TicketsScreen />;
            case 'pending': return <PendingListScreen />;
            case 'tasks': return <TasksScreen />;
            case 'customers': return <CustomersScreen />;
            case 'walkin': return <WalkInScreen />;
            case 'walkin-report': return <WalkInReportScreen />;
            case 'courier': return <CourierScreen />;
            case 'courier-report': return <CourierReportScreen />;
            case 'reports': return <ReportsScreen />;
            case 'inquiries': return <InquiriesScreen />;
            case 'attendance': return <AttendanceScreen />;
            default: return null;
        }
    };

    return (
        <div className="work-controller-dashboard">

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
                        <h2 style={{ margin: 0 }}>Work Controller Menu</h2>
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
                    <div style={{ padding: '8px 16px 16px' }}>
                        <button
                            onClick={() => { setShowWCReport(true); setSidebarOpen(false); }}
                            style={{ width: '100%', padding: '10px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        >
                            📋 WC Report
                        </button>
                    </div>
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
                        {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                    </span>
                </div>
                <div className="dashboard-content">
                    {renderContent()}
                </div>
            </div>
            {showWCReport && (
                <WCDailyReportModal
                    wcId={(session?.user as any)?.email || ''}
                    wcName={(session?.user as any)?.name || 'WC'}
                    onClose={() => setShowWCReport(false)}
                    onSaved={() => setShowWCReport(false)}
                />
            )}
        </div>
    );
}