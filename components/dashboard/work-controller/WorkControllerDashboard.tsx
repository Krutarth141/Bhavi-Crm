'use client';

import { useState } from 'react';

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

type WorkControllerTab =
    | 'tickets' | 'pending' | 'tasks' | 'customers'
    | 'walkin' | 'walkin-report' | 'courier' | 'courier-report'
    | 'reports' | 'inquiries' | 'attendance';

const NAV_ITEMS: { id: WorkControllerTab; label: string }[] = [
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
    const [activeTab, setActiveTab] = useState<WorkControllerTab>('tickets');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleNavClick = (id: WorkControllerTab) => {
        setActiveTab(id);
        setSidebarOpen(false);
    };

    const renderContent = () => {
        switch (activeTab) {
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
                        {NAV_ITEMS.map(item => (
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
                        {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                    </span>
                </div>
                <div className="dashboard-content">
                    {renderContent()}
                </div>
            </div>

        </div>
    );
}