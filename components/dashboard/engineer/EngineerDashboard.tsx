'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useNavVisibility } from '@/hooks/useNavVisibility';
import { useScrollLock } from '@/hooks/useScrollLock';

// Existing screens
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

type EngineerTab = 'overview' | 'my-calls' | 'work-log' | 'my-report' | 'reports' | 'attendance'
    | 'km-report' | 'payment-collection' | 'field-tasks' | 'site-visits' | 'inquiries'
    | 'parts-catalog' | 'fault-finder'
    | 'tickets' | 'eng-parts' | 'pending' | 'route-planning' | 'customers' | 'inventory' | 'amc' | 'work-log-report'
    | 'auto-sites' | 'sw-survey' | 'auto-visits-report' | 'auto-inventory';

type NavSection = 'Main' | 'Management' | 'Automation';
const SECTION_ORDER: NavSection[] = ['Main', 'Management', 'Automation'];

// Base items every engineer gets — mirrors HTML's setupNav() regular-engineer
// branch (sv('nav-tickets',false); sv('nav-eng-parts',false) there). `section`
// mirrors which of HTML's three sidebar <div class="nav-section"> groups
// (index.html:310-361) each item actually lives in.
const NAV_ITEMS: { id: EngineerTab; label: string; section: NavSection }[] = [
    { id: 'overview', label: '📊 Overview', section: 'Main' },
    { id: 'my-calls', label: '📞 My Calls', section: 'Main' },
    { id: 'work-log', label: '🕐 Work Log', section: 'Main' },
    { id: 'my-report', label: '📊 My Report', section: 'Main' },
    { id: 'km-report', label: '🛣️ KM Tracking', section: 'Main' },
    { id: 'payment-collection', label: '💰 Payment Collection', section: 'Main' },
    { id: 'field-tasks', label: '🚚 Other Work', section: 'Main' },
    { id: 'attendance', label: '🗓️ Attendance', section: 'Management' },
    { id: 'inquiries', label: '🔍 Inquiries', section: 'Management' },
    // HTML setupNav(): `if(isEng){sv('nav-parts-catalog',true);sv('nav-fault-finder',true);}`
    // — every engineer gets these two, regardless of CSP-manager status.
    { id: 'parts-catalog', label: '🔩 Parts Catalog', section: 'Management' },
    { id: 'fault-finder', label: '🔍 Fault Finder', section: 'Management' },
    { id: 'eng-parts', label: '🧰 Eng. Parts', section: 'Management' },
];

// CSP Manager (ENG001) only — mirrors HTML's isCspMgr nav extras, which is
// also where HTML turns nav-tickets back on.
const CSP_EXTRA_ITEMS: { id: EngineerTab; label: string; section: NavSection }[] = [
    { id: 'tickets', label: '🎫 All Tickets', section: 'Main' },
    { id: 'reports', label: '📈 Reports', section: 'Management' },
    { id: 'pending', label: '📋 Pending List', section: 'Management' },
    { id: 'route-planning', label: '🗺️ Route Planning', section: 'Management' },
    { id: 'customers', label: '👥 Customers', section: 'Management' },
    { id: 'inventory', label: '🗃️ Inventory', section: 'Management' },
    { id: 'work-log-report', label: '📋 Work Log Report', section: 'Management' },
    { id: 'amc', label: '🔄 AMC', section: 'Management' },
];

// "Auto engineer" accounts (ENG002/ENG008) — mirrors HTML's isAutoEng nav
// gate, granted independent of CSP-manager status.
const AUTO_EXTRA_ITEMS: { id: EngineerTab; label: string; section: NavSection }[] = [
    { id: 'auto-sites', label: '🏗️ Auto Sites', section: 'Automation' },
    { id: 'sw-survey', label: '🔌 SW Survey', section: 'Automation' },
    { id: 'auto-visits-report', label: '📋 Visit Report', section: 'Automation' },
    { id: 'auto-inventory', label: '📦 Auto Inventory', section: 'Automation' },
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

    const [activeTab, setActiveTab] = useState<EngineerTab>('my-calls');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    useScrollLock(sidebarOpen);
    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [showPortalQR, setShowPortalQR] = useState(false);
    const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);
    const [pendingSwSite, setPendingSwSite] = useState<{ siteId: number | null; siteName: string | null } | null>(null);

    const handleNavClick = (id: EngineerTab) => {
        setActiveTab(id);
        setSidebarOpen(false);
    };

    useEffect(() => {
        const onNavigate = (e: Event) => {
            const detail = (e as CustomEvent<{ tab: EngineerTab; ticketId?: string; siteId?: number; siteName?: string }>).detail;
            const tab = detail?.tab;
            if (tab && (allNavItems.some((n) => n.id === tab) || tab === 'pending')) {
                setActiveTab(tab);
                if (tab === 'my-calls' && detail?.ticketId) setPendingTicketId(detail.ticketId);
                if (tab === 'sw-survey' && detail?.siteId != null) setPendingSwSite({ siteId: detail.siteId, siteName: detail.siteName ?? null });
            }
        };
        window.addEventListener('bhavi:navigate-tab', onNavigate);
        return () => window.removeEventListener('bhavi:navigate-tab', onNavigate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cspMgr, autoEng]);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <DashboardOverview role="engineer" />;
            case 'my-calls': return <MyCallsScreen initialTicketId={pendingTicketId} onConsumedInitialTicket={() => setPendingTicketId(null)} />;
            case 'work-log': return <EngineerWorkLogScreen engId={engId} engName={engName} />;
            case 'my-report': return <MyReportScreen />;
            case 'reports': return cspMgr ? <ReportsScreen /> : null;
            case 'attendance': return <AttendanceScreen />;
            case 'km-report': return <KmTrackingScreen />;
            case 'payment-collection': return <PaymentCollectionScreen />;
            case 'inquiries': return <InquiriesScreen />;
            case 'field-tasks': return <FieldTasksScreen />;
            case 'parts-catalog': return <PartsCatalogScreen />;
            case 'fault-finder': return <FaultFinderScreen />;
            case 'site-visits': return null;
            case 'tickets': return cspMgr ? <TicketsScreen /> : null;
            case 'eng-parts': return <EngPartsScreen />;
            case 'pending': return <PendingListScreen />;
            case 'route-planning': return cspMgr ? <RoutePlanningScreen /> : null;
            case 'customers': return cspMgr ? <CustomersScreen /> : null;
            case 'inventory': return cspMgr ? <InventoryScreen /> : null;
            case 'amc': return cspMgr ? <AMCScreen /> : null;
            case 'work-log-report': return cspMgr ? <WorkLogScreen /> : null;
            case 'auto-sites': return autoEng ? <AutoSitesScreen /> : null;
            case 'sw-survey': return autoEng ? <SwSurveyScreen initialSiteId={pendingSwSite?.siteId ?? null} initialSiteName={pendingSwSite?.siteName ?? null} onConsumedInitialSite={() => setPendingSwSite(null)} /> : null;
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
                        <h2 className="dashboard-nav-title">Engineer Menu</h2>
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
                                    {/* Customer Portal sits with the rest of Management (index.html:351) */}
                                    {section === 'Management' && (
                                        <li>
                                            <button onClick={() => { setShowPortalQR(true); setSidebarOpen(false); }}>
                                                📱 Customer Portal
                                            </button>
                                        </li>
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