'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useNavVisibility } from '@/hooks/useNavVisibility';

// Existing screens
import TicketsScreen from '@/components/screens/TicketsScreen';
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
import KmTrackingScreen from '@/components/screens/KmTrackingScreen';
import PaymentCollectionScreen from '@/components/screens/PaymentCollectionScreen';
import { isAccountant } from '@/lib/permissions';
import FieldTasksScreen from '@/components/screens/FieldTasksScreen';
import SiteVisitsScreen from '@/components/screens/SiteVisitsScreen';
import TatReportScreen from '@/components/screens/TatReportScreen';
import PaymentQrModal from '@/components/screens/PaymentQrModal';
import CustomerPortalQrModal from '@/components/screens/CustomerPortalQrModal';
import PartRequestScreen from '@/components/screens/PartRequestScreen';
import InventoryScreen from '@/components/screens/InventoryScreen';
import MasterDataScreen from '@/components/screens/MasterDataScreen';
import SalesScreen from '@/components/screens/SalesScreen';
import RoutePlanningScreen from '@/components/screens/RoutePlanningScreen';
import WorkLogScreen, { EngineerWorkLogScreen } from '@/components/screens/WorkLogScreen';

type WorkControllerTab =
    | 'overview' | 'tickets' | 'pending' | 'customers'
    | 'walkin' | 'walkin-report' | 'courier' | 'courier-report'
    | 'reports' | 'inquiries' | 'attendance' | 'km-report' | 'payment-collection' | 'field-tasks' | 'site-visits' | 'tat-report'
    | 'part-request' | 'inventory' | 'work-log' | 'work-log-report' | 'master' | 'sales' | 'route-planning';

const NAV_ITEMS: { id: WorkControllerTab; label: string }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'tickets', label: '🎫 All Tickets' },
    { id: 'pending', label: '📋 Pending List' },
    { id: 'customers', label: '👥 Customers' },
    { id: 'walkin', label: '🚶 Walk-in' },
    { id: 'walkin-report', label: '🚶 Walk-in Report' },
    { id: 'courier', label: '📦 Courier' },
    { id: 'courier-report', label: '📦 Courier Register' },
    { id: 'reports', label: '📈 Reports' },
    { id: 'inquiries', label: '🔍 Inquiries' },
    { id: 'attendance', label: '🗓️ Attendance' },
    { id: 'km-report', label: '🛣️ KM Tracking' },
    { id: 'payment-collection', label: '💰 Payment Collection' },
    { id: 'inventory', label: '🗃️ Inventory' },
    { id: 'field-tasks', label: '🚚 Other Work' },
    { id: 'site-visits', label: '🏗️ Site Visits' },
    { id: 'tat-report', label: '⏱️ TAT Compliance' },
    { id: 'part-request', label: '🧰 Part Requests' },
    { id: 'work-log', label: '🗒️ Work Log' },
    { id: 'work-log-report', label: '📋 Work Log Report' },
    { id: 'master', label: '🗂️ Master Data' },
    { id: 'sales', label: '💼 Sales' },
    { id: 'route-planning', label: '🗺️ Route Planning' },
];

// index.html:2914-2916 (setupNav's isWC branch) hides Reports, Walk-in Report,
// and Courier Report from every Work Controller by default (sv(...,false)) —
// unlike other WC items, these are NOT visible unless a per-employee nav
// permission override explicitly turns them on.
const WC_DEFAULT_OFF = new Set<WorkControllerTab>(['reports', 'walkin-report', 'courier-report']);

export default function WorkControllerDashboard() {
    const { data: session } = useSession();
    const uid = (session?.user as any)?.id != null ? String((session?.user as any).id) : undefined;
    const wcId = (session?.user as any)?.email || '';
    const wcName = (session?.user as any)?.name || 'WC';
    const { isVisible } = useNavVisibility(uid);
    const isAcct = isAccountant(session);
    // Payment Collection and Inventory are Accountant-only among Work
    // Controllers — plain WCs never see either, regardless of nav permission
    // overrides (index.html:2918-2921,2926: window._isAcct gates both).
    const visibleNavItems = NAV_ITEMS
        .filter((item) => item.id !== 'payment-collection' || isAcct)
        .filter((item) => item.id !== 'inventory' || isAcct)
        .filter((item) => item.id === 'overview' || isVisible(item.id, !WC_DEFAULT_OFF.has(item.id)));

    const [activeTab, setActiveTab] = useState<WorkControllerTab>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showWCReport, setShowWCReport] = useState(false);
    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [showPortalQR, setShowPortalQR] = useState(false);
    // "+ New Call" fired from the Dashboard's Recent Tickets card
    // (index.html:3857) — same 'bhavi:navigate-tab' CustomEvent pattern
    // EngineerDashboard already uses to cross-navigate + hand off a pending
    // action.
    const [pendingNewCall, setPendingNewCall] = useState(false);

    const handleNavClick = (id: WorkControllerTab) => {
        setActiveTab(id);
        setSidebarOpen(false);
    };

    useEffect(() => {
        const onNavigate = (e: Event) => {
            const detail = (e as CustomEvent<{ tab: WorkControllerTab; openNewCall?: boolean }>).detail;
            if (detail?.tab === 'tickets') {
                setActiveTab('tickets');
                if (detail.openNewCall) setPendingNewCall(true);
            }
        };
        window.addEventListener('bhavi:navigate-tab', onNavigate);
        return () => window.removeEventListener('bhavi:navigate-tab', onNavigate);
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <DashboardOverview role="work_controller" />;
            case 'tickets': return <TicketsScreen autoOpenAdd={pendingNewCall} onConsumedAutoOpenAdd={() => setPendingNewCall(false)} />;
            case 'pending': return <PendingListScreen />;
            case 'customers': return <CustomersScreen />;
            case 'walkin': return <WalkInScreen />;
            case 'walkin-report': return <WalkInReportScreen />;
            case 'courier': return <CourierScreen />;
            case 'courier-report': return <CourierReportScreen />;
            case 'reports': return <ReportsScreen />;
            case 'inquiries': return <InquiriesScreen />;
            case 'attendance': return <AttendanceScreen />;
            case 'km-report': return <KmTrackingScreen />;
            case 'payment-collection': return <PaymentCollectionScreen />;
            case 'inventory': return <InventoryScreen />;
            case 'field-tasks': return <FieldTasksScreen />;
            case 'site-visits': return <SiteVisitsScreen />;
            case 'tat-report': return <TatReportScreen />;
            case 'part-request': return <PartRequestScreen />;
            case 'work-log': return <EngineerWorkLogScreen engId={wcId} engName={wcName} />;
            case 'work-log-report': return <WorkLogScreen />;
            case 'master': return <MasterDataScreen />;
            case 'sales': return <SalesScreen />;
            case 'route-planning': return <RoutePlanningScreen />;
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
                        <li>
                            <button onClick={() => { setShowWCReport(true); setSidebarOpen(false); }}>
                                📋 WC Report
                            </button>
                        </li>
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
                        {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                    </span>
                </div>
                <div className="dashboard-content">
                    {renderContent()}
                </div>
            </div>
            {showWCReport && (
                <WCDailyReportModal
                    wcId={wcId}
                    wcName={wcName}
                    onClose={() => setShowWCReport(false)}
                    onSaved={() => setShowWCReport(false)}
                />
            )}
            {showPaymentQR && (
                <PaymentQrModal isAdmin={false} onClose={() => setShowPaymentQR(false)} />
            )}
            {showPortalQR && (
                <CustomerPortalQrModal onClose={() => setShowPortalQR(false)} />
            )}
        </div>
    );
}