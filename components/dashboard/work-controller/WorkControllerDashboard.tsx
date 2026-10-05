'use client';

import { useEffect, useState } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
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

type NavSection = 'Main' | 'Management' | 'Automation';
const SECTION_ORDER: NavSection[] = ['Main', 'Management', 'Automation'];

// `section` mirrors which of HTML's three sidebar <div class="nav-section">
// groups (index.html:310-361) each item lives in. Part Requests has no
// direct HTML sidebar equivalent and is bucketed under Management, matching
// HTML's own catch-all for back-office tools.
const NAV_ITEMS: { id: WorkControllerTab; label: string; section: NavSection }[] = [
    { id: 'overview', label: '📊 Overview', section: 'Main' },
    { id: 'tickets', label: '🎫 All Tickets', section: 'Main' },
    { id: 'walkin', label: '🚶 Walk-in', section: 'Main' },
    { id: 'courier', label: '📦 Courier', section: 'Main' },
    { id: 'km-report', label: '🛣️ KM Tracking', section: 'Main' },
    { id: 'payment-collection', label: '💰 Payment Collection', section: 'Main' },
    { id: 'field-tasks', label: '🚚 Other Work', section: 'Main' },
    { id: 'site-visits', label: '🏗️ Site Visits', section: 'Main' },
    { id: 'work-log', label: '🗒️ Work Log', section: 'Main' },
    { id: 'pending', label: '📋 Pending List', section: 'Management' },
    { id: 'customers', label: '👥 Customers', section: 'Management' },
    { id: 'walkin-report', label: '🚶 Walk-in Report', section: 'Management' },
    { id: 'courier-report', label: '📦 Courier Register', section: 'Management' },
    { id: 'reports', label: '📈 Reports', section: 'Management' },
    { id: 'inquiries', label: '🔍 Inquiries', section: 'Management' },
    { id: 'attendance', label: '🗓️ Attendance', section: 'Management' },
    { id: 'inventory', label: '🗃️ Inventory', section: 'Management' },
    { id: 'tat-report', label: '⏱️ TAT Compliance', section: 'Management' },
    { id: 'part-request', label: '🧰 Part Requests', section: 'Management' },
    { id: 'work-log-report', label: '📋 Work Log Report', section: 'Management' },
    { id: 'master', label: '🗂️ Master Data', section: 'Management' },
    { id: 'sales', label: '💼 Sales', section: 'Management' },
    { id: 'route-planning', label: '🗺️ Route Planning', section: 'Management' },
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
    useScrollLock(sidebarOpen);
    const [showWCReport, setShowWCReport] = useState(false);
    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [showPortalQR, setShowPortalQR] = useState(false);
    // "+ New Call" fired from the Dashboard's Recent Tickets card
    // (index.html:3857) — same 'bhavi:navigate-tab' CustomEvent pattern
    // EngineerDashboard already uses to cross-navigate + hand off a pending
    // action.
    const [pendingNewCall, setPendingNewCall] = useState(false);
    const [pendingViewTicketId, setPendingViewTicketId] = useState<string | null>(null);

    const handleNavClick = (id: WorkControllerTab) => {
        setActiveTab(id);
        setSidebarOpen(false);
    };

    useEffect(() => {
        const onNavigate = (e: Event) => {
            const detail = (e as CustomEvent<{ tab: WorkControllerTab; openNewCall?: boolean; ticketId?: string }>).detail;
            if (detail?.tab === 'tickets') {
                setActiveTab('tickets');
                if (detail.openNewCall) setPendingNewCall(true);
                if (detail.ticketId) setPendingViewTicketId(detail.ticketId);
            }
        };
        window.addEventListener('bhavi:navigate-tab', onNavigate);
        return () => window.removeEventListener('bhavi:navigate-tab', onNavigate);
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <DashboardOverview role="work_controller" />;
            case 'tickets': return <TicketsScreen autoOpenAdd={pendingNewCall} onConsumedAutoOpenAdd={() => setPendingNewCall(false)} autoOpenTicketId={pendingViewTicketId} onConsumedAutoOpenTicketId={() => setPendingViewTicketId(null)} />;
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
            case 'work-log': return <EngineerWorkLogScreen engId={wcId} engName={wcName} isWC />;
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
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 998, overscrollBehavior: 'contain' }}
                />
            )}

            {/* Sidebar */}
            <div className={`dashboard-sidebar${sidebarOpen ? ' open' : ''}`}>
                <nav className="dashboard-nav">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 8px' }}>
                        <h2 className="dashboard-nav-title">Work Controller Menu</h2>
                        <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
                    </div>
                    {SECTION_ORDER.map((section) => {
                        const items = visibleNavItems.filter((item) => item.section === section);
                        if (!items.length) return null;
                        return (
                            <div className="nav-section" key={section}>
                                <div className="nav-section-title">{section}</div>
                                <ul>
                                    {items.map(item => (
                                        <li key={item.id}>
                                            <button
                                                className={activeTab === item.id ? 'active' : ''}
                                                onClick={() => handleNavClick(item.id)}
                                            >
                                                {item.label}
                                            </button>
                                        </li>
                                    ))}
                                    {/* Payment QR sits with the rest of Main (index.html:315) */}
                                    {section === 'Main' && (
                                        <li>
                                            <button onClick={() => { setShowPaymentQR(true); setSidebarOpen(false); }}>
                                                💳 Payment QR
                                            </button>
                                        </li>
                                    )}
                                    {/* WC Report + Customer Portal sit with the rest of Management
                                        (index.html:333, 351) */}
                                    {section === 'Management' && (
                                        <>
                                            <li>
                                                <button onClick={() => { setShowWCReport(true); setSidebarOpen(false); }}>
                                                    📋 WC Report
                                                </button>
                                            </li>
                                            <li>
                                                <button onClick={() => { setShowPortalQR(true); setSidebarOpen(false); }}>
                                                    📱 Customer Portal
                                                </button>
                                            </li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        );
                    })}
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