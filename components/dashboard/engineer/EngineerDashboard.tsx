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
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import { isCspManager, isAutoEng } from '@/lib/permissions';
import AutoSitesScreen from '@/components/screens/AutoSitesScreen';
import AutoVisitsReportScreen from '@/components/screens/AutoVisitsReportScreen';
import SwSurveyScreen from '@/components/screens/SwSurveyScreen';
import AutoInventoryScreen from '@/components/screens/AutoInventoryScreen';
import AttendanceScreen from '@/components/screens/AttendanceScreen';
import ReportsScreen from '@/components/screens/ReportsScreen';
import PendingListScreen from '@/components/screens/PendingListScreen';
import CustomersScreen from '@/components/screens/CustomersScreen';
import RoutePlanningScreen from '@/components/screens/RoutePlanningScreen';
import InventoryScreen from '@/components/screens/InventoryScreen';
import AMCScreen from '@/components/screens/AMCScreen';
import WorkLogScreen, { EngineerWorkLogScreen } from '@/components/screens/WorkLogScreen';
import KmTrackingScreen from '@/components/screens/KmTrackingScreen';
import PaymentCollectionScreen from '@/components/screens/PaymentCollectionScreen';
import FieldTasksScreen from '@/components/screens/FieldTasksScreen';
import SiteVisitsScreen from '@/components/screens/SiteVisitsScreen';
import InquiriesScreen from '@/components/screens/InquiriesScreen';
import PaymentQrModal from '@/components/screens/PaymentQrModal';
import CustomerPortalQrModal from '@/components/screens/CustomerPortalQrModal';
import PartsCatalogScreen from '@/components/screens/PartsCatalogScreen';
import FaultFinderScreen from '@/components/screens/FaultFinderScreen';

type EngineerTab = 'overview' | 'my-calls' | 'work-log' | 'tasks' | 'reports' | 'attendance'
    | 'km-report' | 'payment-collection' | 'field-tasks' | 'site-visits' | 'inquiries'
    | 'parts-catalog' | 'fault-finder'
    | 'tickets' | 'eng-parts' | 'pending' | 'route-planning' | 'customers' | 'inventory' | 'amc' | 'work-log-report'
    | 'auto-sites' | 'sw-survey' | 'auto-visits-report' | 'auto-inventory';

// Base items every engineer gets — mirrors HTML's setupNav() regular-engineer
// branch (sv('nav-tickets',false); sv('nav-eng-parts',false) there).
const NAV_ITEMS: { id: EngineerTab; label: string }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'my-calls', label: '📞 My Calls' },
    { id: 'work-log', label: '🗒️ Work Log' },
    { id: 'tasks', label: '📋 My Tasks' },
    { id: 'reports', label: '📈 My Reports' },
    { id: 'attendance', label: '🗓️ Attendance' },
    { id: 'km-report', label: '🛣️ KM Tracking' },
    { id: 'payment-collection', label: '💰 Payment Collection' },
    { id: 'inquiries', label: '🔎 Inquiries' },
    { id: 'field-tasks', label: '🚚 Other Work' },
    // HTML setupNav(): `if(isEng){sv('nav-parts-catalog',true);sv('nav-fault-finder',true);}`
    // — every engineer gets these two, regardless of CSP-manager status.
    { id: 'parts-catalog', label: '📚 Parts Catalog' },
    { id: 'fault-finder', label: '🔍 Fault Finder' },
];

// CSP Manager (ENG001) only — mirrors HTML's isCspMgr nav extras, which is
// also where HTML turns nav-tickets and nav-eng-parts back on.
const CSP_EXTRA_ITEMS: { id: EngineerTab; label: string }[] = [
    { id: 'tickets', label: '🎫 All Tickets' },
    { id: 'eng-parts', label: '🔩 Eng. Parts' },
    { id: 'pending', label: '📋 Pending List' },
    { id: 'route-planning', label: '🗺️ Route Planning' },
    { id: 'customers', label: '👥 Customers' },
    { id: 'inventory', label: '📦 Inventory' },
    { id: 'work-log-report', label: '📝 Work Log Report' },
    { id: 'amc', label: '🛡️ AMC' },
    // HTML's engineer branch ends with sv('nav-site-visits',false) — Site Visits is
    // NOT a base engineer nav item. Kept here for CSP managers only (they run the
    // WC-style site-visit workflow); plain engineers no longer see it.
    { id: 'site-visits', label: '🏗️ Site Visits' },
];

// "Auto engineer" accounts (ENG002/ENG008) — mirrors HTML's isAutoEng nav
// gate, granted independent of CSP-manager status.
const AUTO_EXTRA_ITEMS: { id: EngineerTab; label: string }[] = [
    { id: 'auto-sites', label: '🏢 Auto Sites' },
    { id: 'sw-survey', label: '📝 SW Survey' },
    { id: 'auto-visits-report', label: '📊 Auto Visits Report' },
    { id: 'auto-inventory', label: '📦 Auto Inventory' },
];

export default function EngineerDashboard() {
    const { data: session } = useSession();
    const cspMgr = isCspManager(session);
    const autoEng = isAutoEng(session);
    const uid = (session?.user as any)?.id != null ? String((session?.user as any).id) : undefined;
    const engId = (session?.user as any)?.email ?? uid ?? '';
    const engName = (session?.user as any)?.name ?? '';
    const { isVisible } = useNavVisibility(uid);
    const allNavItems = [
        ...NAV_ITEMS,
        ...(cspMgr ? CSP_EXTRA_ITEMS : []),
        ...(autoEng ? AUTO_EXTRA_ITEMS : []),
    ];
    const visibleNavItems = allNavItems.filter((item) => item.id === 'overview' || isVisible(item.id));

    const [activeTab, setActiveTab] = useState<EngineerTab>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [showPortalQR, setShowPortalQR] = useState(false);

    const handleNavClick = (id: EngineerTab) => {
        setActiveTab(id);
        setSidebarOpen(false);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <DashboardOverview role="engineer" />;
            case 'my-calls': return <MyCallsScreen />;
            case 'work-log': return <EngineerWorkLogScreen engId={engId} engName={engName} />;
            case 'tasks': return <TasksScreen />;
            case 'reports': return cspMgr ? <ReportsScreen /> : <MyReportScreen />;
            case 'attendance': return <AttendanceScreen />;
            case 'km-report': return <KmTrackingScreen />;
            case 'payment-collection': return <PaymentCollectionScreen />;
            case 'inquiries': return <InquiriesScreen />;
            case 'field-tasks': return <FieldTasksScreen />;
            case 'parts-catalog': return <PartsCatalogScreen />;
            case 'fault-finder': return <FaultFinderScreen />;
            case 'site-visits': return cspMgr ? <SiteVisitsScreen /> : null;
            case 'tickets': return cspMgr ? <TicketsScreen /> : null;
            case 'eng-parts': return cspMgr ? <EngPartsScreen /> : null;
            case 'pending': return cspMgr ? <PendingListScreen /> : null;
            case 'route-planning': return cspMgr ? <RoutePlanningScreen /> : null;
            case 'customers': return cspMgr ? <CustomersScreen /> : null;
            case 'inventory': return cspMgr ? <InventoryScreen /> : null;
            case 'amc': return cspMgr ? <AMCScreen /> : null;
            case 'work-log-report': return cspMgr ? <WorkLogScreen /> : null;
            case 'auto-sites': return autoEng ? <AutoSitesScreen /> : null;
            case 'sw-survey': return autoEng ? <SwSurveyScreen /> : null;
            case 'auto-visits-report': return autoEng ? <AutoVisitsReportScreen /> : null;
            case 'auto-inventory': return autoEng ? <AutoInventoryScreen /> : null;
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
                        <li>
                            <button onClick={() => { setShowPaymentQR(true); setSidebarOpen(false); }}>
                                💳 Payment QR
                            </button>
                        </li>
                        <li>
                            <button onClick={() => { setShowPortalQR(true); setSidebarOpen(false); }}>
                                📱 Customer Portal
                            </button>
                        </li>
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
            {showPaymentQR && (
                <PaymentQrModal isAdmin={false} onClose={() => setShowPaymentQR(false)} />
            )}
            {showPortalQR && (
                <CustomerPortalQrModal onClose={() => setShowPortalQR(false)} />
            )}
        </div>
    );
}