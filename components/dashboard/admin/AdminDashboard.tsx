'use client';

import { useEffect, useState } from 'react';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import AdminUserManagement from './AdminUserManagement';

// Existing screens
import TicketsScreen from '@/components/screens/TicketsScreen';
import InventoryScreen from '@/components/screens/InventoryScreen';
import CustomersScreen from '@/components/screens/CustomersScreen';
import ReportsScreen from '@/components/screens/ReportsScreen';
import MasterDataScreen from '@/components/screens/MasterDataScreen';
import WorkLogScreen from '@/components/screens/WorkLogScreen';

// Kiro screens
import EngineersScreen from '@/components/screens/EngineersScreen';
import CourierScreen from '@/components/screens/CourierScreen';
import CourierReportScreen from '@/components/screens/CourierReportScreen';
import WalkInScreen from '@/components/screens/WalkInScreen';
import WalkInReportScreen from '@/components/screens/WalkInReportScreen';
import PendingListScreen from '@/components/screens/PendingListScreen';
import EngPartsScreen from '@/components/screens/EngPartsScreen';
import AttendanceScreen from '@/components/screens/AttendanceScreen';
import AMCScreen from '@/components/screens/AMCScreen';
import PartsCatalogScreen from '@/components/screens/PartsCatalogScreen';
import FaultFinderScreen from '@/components/screens/FaultFinderScreen';
import TargetsScreen from '@/components/screens/TargetsScreen';
import SalesScreen from '@/components/screens/SalesScreen';
import InquiriesScreen from '@/components/screens/InquiriesScreen';
import AutoSitesScreen from '@/components/screens/AutoSitesScreen';
import AutoInventoryScreen from '@/components/screens/AutoInventoryScreen';
import WeeklyReportScreen from '@/components/screens/WeeklyReportScreen';
import AutoVisitsReportScreen from '@/components/screens/AutoVisitsReportScreen';
import RoutePlanningScreen from '@/components/screens/RoutePlanningScreen';
import LiveMapScreen from '@/components/screens/LiveMapScreen';
import CustomerApprovalScreen from '@/components/screens/CustomerApprovalScreen';
import EngineerUpdateScreen from '@/components/screens/EngineerUpdateScreen';
import PartRequestScreen from '@/components/screens/PartRequestScreen';
import ReportEditScreen from '@/components/screens/ReportEditScreen';
import AIAgentScreen from '@/components/screens/AIAgentScreen';
import AIAnalysisScreen from '@/components/screens/AIAnalysisScreen';
import PeonActivityScreen from '@/components/screens/PeonActivityScreen';
import FollowupScreen from '@/components/screens/FollowupScreen';
import PartsReorderScreen from '@/components/screens/PartsReorderScreen';
import KmTrackingScreen from '@/components/screens/KmTrackingScreen';
import PaymentCollectionScreen from '@/components/screens/PaymentCollectionScreen';
import FieldTasksScreen from '@/components/screens/FieldTasksScreen';
import SiteVisitsScreen from '@/components/screens/SiteVisitsScreen';
import SwSurveyScreen from '@/components/screens/SwSurveyScreen';
import EngDailyReportScreen from '@/components/screens/EngDailyReportScreen';
import PaymentQrModal from '@/components/screens/PaymentQrModal';
import CustomerPortalQrModal from '@/components/screens/CustomerPortalQrModal';

import '@/styles/dashboard.css';

type AdminTab =
    | 'overview' | 'tickets' | 'pending' | 'inventory' | 'eng-parts'
    | 'customers' | 'walkin' | 'walkin-report' | 'courier'
    | 'courier-report' | 'reports' | 'worklogs' | 'engineers' | 'master'
    | 'settings' | 'live-map' | 'attendance' | 'targets' | 'amc'
    | 'weekly-report' | 'sales' | 'parts-catalog'
    | 'fault-finder' | 'route-planning' | 'inquiries' | 'auto-inventory'
    | 'auto-sites' | 'auto-visits-report' | 'ai-agent' | 'ai-analysis'
    | 'report-edit' | 'customer-approval' | 'engineer-update' | 'part-request' | 'peon-activity'
    | 'followup' | 'reorder' | 'km-report' | 'payment-collection' | 'field-tasks' | 'site-visits' | 'sw-survey' | 'eng-daily-report';

type NavSection = 'Main' | 'Management' | 'Automation';
const SECTION_ORDER: NavSection[] = ['Main', 'Management', 'Automation'];

// `section` mirrors which of HTML's three sidebar <div class="nav-section">
// groups (index.html:310-361) each item lives in. Admin-only screens with no
// direct HTML sidebar equivalent (AI Agent, Import Calls, Engineer Update,
// Part Request, Follow-up Tracker, Parts Reorder, Engineers) are bucketed
// under Management, matching HTML's own catch-all for admin back-office tools.
const NAV_ITEMS: { id: AdminTab; label: string; section: NavSection }[] = [
    { id: 'overview', label: '📊 Overview', section: 'Main' },
    { id: 'tickets', label: '🎫 All Tickets', section: 'Main' },
    { id: 'walkin', label: '🚶 Walk-in', section: 'Main' },
    { id: 'courier', label: '📦 Courier', section: 'Main' },
    { id: 'km-report', label: '🛣️ KM Tracking', section: 'Main' },
    { id: 'payment-collection', label: '💰 Payment Collection', section: 'Main' },
    { id: 'field-tasks', label: '🚚 Other Work', section: 'Main' },
    { id: 'site-visits', label: '🏗️ Site Visits', section: 'Main' },
    { id: 'eng-daily-report', label: '📅 Engineer Daily Report', section: 'Main' },
    { id: 'pending', label: '📋 Pending List', section: 'Management' },
    { id: 'inventory', label: '🗃️ Inventory', section: 'Management' },
    { id: 'eng-parts', label: '🧰 Eng. Parts', section: 'Management' },
    { id: 'customers', label: '👥 Customers', section: 'Management' },
    { id: 'walkin-report', label: '🚶 Walk-in Report', section: 'Management' },
    { id: 'courier-report', label: '📦 Courier Register', section: 'Management' },
    { id: 'reports', label: '📈 Reports', section: 'Management' },
    { id: 'worklogs', label: '🕒 Work Logs', section: 'Management' },
    { id: 'engineers', label: '👷 Engineers', section: 'Management' },
    { id: 'master', label: '🗂️ Master Data', section: 'Management' },
    { id: 'settings', label: '⚙️ Settings', section: 'Management' },
    { id: 'live-map', label: '📍 Live Map', section: 'Management' },
    { id: 'attendance', label: '🗓️ Attendance', section: 'Management' },
    { id: 'peon-activity', label: '🧹 Peon Activity', section: 'Management' },
    { id: 'targets', label: '🎯 Targets', section: 'Management' },
    { id: 'amc', label: '🔄 AMC', section: 'Management' },
    { id: 'weekly-report', label: '📊 Weekly Report', section: 'Management' },
    { id: 'sales', label: '💼 Sales', section: 'Management' },
    { id: 'parts-catalog', label: '🔩 Parts Catalog', section: 'Management' },
    { id: 'fault-finder', label: '🔍 Fault Finder', section: 'Management' },
    { id: 'route-planning', label: '🗺️ Route Planning', section: 'Management' },
    { id: 'inquiries', label: '🔍 Inquiries', section: 'Management' },
    { id: 'ai-agent', label: '🤖 Virtual AI Agent', section: 'Management' },
    { id: 'ai-analysis', label: '🤖 AI Analysis', section: 'Management' },
    { id: 'report-edit', label: '📥 Import Calls', section: 'Management' },
    { id: 'customer-approval', label: '✅ Customer Approval', section: 'Management' },
    { id: 'engineer-update', label: '🛠️ Engineer Update', section: 'Management' },
    { id: 'part-request', label: '🧰 Part Request', section: 'Management' },
    { id: 'followup', label: '📞 Follow-up Tracker', section: 'Management' },
    { id: 'reorder', label: '📦 Parts Reorder Alert', section: 'Management' },
    { id: 'auto-inventory', label: '📦 Auto Inventory', section: 'Automation' },
    { id: 'auto-sites', label: '🏗️ Auto Sites', section: 'Automation' },
    { id: 'auto-visits-report', label: '📋 Visit Report', section: 'Automation' },
    { id: 'sw-survey', label: '🔌 SW Survey', section: 'Automation' },
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [showPortalQR, setShowPortalQR] = useState(false);
    // "+ New Call" fired from the Dashboard's Recent Tickets card
    // (index.html:3857) — same 'bhavi:navigate-tab' CustomEvent pattern
    // EngineerDashboard already uses to cross-navigate + hand off a pending
    // action.
    const [pendingNewCall, setPendingNewCall] = useState(false);
    const [pendingViewTicketId, setPendingViewTicketId] = useState<string | null>(null);

    const handleNavClick = (id: AdminTab) => {
        setActiveTab(id);
        setSidebarOpen(false);
    };

    useEffect(() => {
        const onNavigate = (e: Event) => {
            const detail = (e as CustomEvent<{ tab: AdminTab; openNewCall?: boolean; ticketId?: string }>).detail;
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
            case 'overview': return <DashboardOverview role="admin" />;
            case 'tickets': return <TicketsScreen autoOpenAdd={pendingNewCall} onConsumedAutoOpenAdd={() => setPendingNewCall(false)} autoOpenTicketId={pendingViewTicketId} onConsumedAutoOpenTicketId={() => setPendingViewTicketId(null)} />;
            case 'pending': return <PendingListScreen />;
            case 'inventory': return <InventoryScreen />;
            case 'eng-parts': return <EngPartsScreen />;
            case 'customers': return <CustomersScreen />;
            case 'walkin': return <WalkInScreen />;
            case 'walkin-report': return <WalkInReportScreen />;
            case 'courier': return <CourierScreen />;
            case 'courier-report': return <CourierReportScreen />;
            case 'reports': return <ReportsScreen />;
            case 'worklogs': return <WorkLogScreen />;
            case 'engineers': return <EngineersScreen />;
            case 'master': return <MasterDataScreen />;
            case 'settings': return <AdminUserManagement />;
            case 'live-map': return <LiveMapScreen />;
            case 'inquiries': return <InquiriesScreen />;
            case 'attendance': return <AttendanceScreen />;
            case 'peon-activity': return <PeonActivityScreen />;
            case 'targets': return <TargetsScreen />;
            case 'amc': return <AMCScreen />;
            case 'weekly-report': return <WeeklyReportScreen />;
            case 'sales': return <SalesScreen />;
            case 'parts-catalog': return <PartsCatalogScreen />;
            case 'fault-finder': return <FaultFinderScreen />;
            case 'route-planning': return <RoutePlanningScreen />;
            case 'auto-inventory': return <AutoInventoryScreen />;
            case 'auto-sites': return <AutoSitesScreen />;
            case 'auto-visits-report': return <AutoVisitsReportScreen />;
            case 'ai-agent': return <AIAgentScreen />;
            case 'ai-analysis': return <AIAnalysisScreen />;
            case 'report-edit': return <ReportEditScreen />;
            case 'customer-approval': return <CustomerApprovalScreen />;
            case 'engineer-update': return <EngineerUpdateScreen />;
            case 'part-request': return <PartRequestScreen />;
            case 'followup': return <FollowupScreen />;
            case 'reorder': return <PartsReorderScreen />;
            case 'km-report': return <KmTrackingScreen />;
            case 'payment-collection': return <PaymentCollectionScreen />;
            case 'field-tasks': return <FieldTasksScreen />;
            case 'site-visits': return <SiteVisitsScreen />;
            case 'sw-survey': return <SwSurveyScreen />;
            case 'eng-daily-report': return <EngDailyReportScreen />;
            default: return null;
        }
    };

    return (
        <div className="admin-dashboard">

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
                        <h2 className="dashboard-nav-title">Admin Menu</h2>
                        <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
                    </div>
                    {SECTION_ORDER.map((section) => {
                        const items = NAV_ITEMS.filter((item) => item.section === section);
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
                        {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                    </span>
                </div>
                <div className="dashboard-content">
                    {renderContent()}
                </div>
            </div>
            {showPaymentQR && (
                <PaymentQrModal isAdmin onClose={() => setShowPaymentQR(false)} />
            )}
            {showPortalQR && (
                <CustomerPortalQrModal onClose={() => setShowPortalQR(false)} />
            )}
        </div>
    );
}