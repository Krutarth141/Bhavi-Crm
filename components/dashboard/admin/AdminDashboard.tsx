'use client';

import { useState } from 'react';
import AdminStats from './AdminStats';
import AdminUserManagement from './AdminUserManagement';
import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

// Existing screens
import TicketsScreen from '@/components/screens/TicketsScreen';
import InventoryScreen from '@/components/screens/InventoryScreen';
import TasksScreen from '@/components/screens/TasksScreen';
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
import FeedbackScreen from '@/components/screens/FeedbackScreen';
import PartsCatalogScreen from '@/components/screens/PartsCatalogScreen';
import FaultFinderScreen from '@/components/screens/FaultFinderScreen';
import TargetsScreen from '@/components/screens/TargetsScreen';
import SalesScreen from '@/components/screens/SalesScreen';
import InquiriesScreen from '@/components/screens/InquiriesScreen';
import AutoSitesScreen from '@/components/screens/AutoSitesScreen';
import AutoInventoryScreen from '@/components/screens/AutoInventoryScreen';
import ProfitScreen from '@/components/screens/ProfitScreen';
import WeeklyReportScreen from '@/components/screens/WeeklyReportScreen';
import AutoVisitsReportScreen from '@/components/screens/AutoVisitsReportScreen';
import RoutePlanningScreen from '@/components/screens/RoutePlanningScreen';

import '@/styles/dashboard.css';

type AdminTab =
    | 'overview'
    | 'tickets'
    | 'pending'
    | 'inventory'
    | 'eng-parts'
    | 'tasks'
    | 'customers'
    | 'walkin'
    | 'walkin-report'
    | 'courier'
    | 'courier-report'
    | 'reports'
    | 'worklogs'
    | 'engineers'
    | 'master'
    | 'settings'
    | 'live-map'
    | 'attendance'
    | 'targets'
    | 'amc'
    | 'feedback'
    | 'profit'
    | 'weekly-report'
    | 'sales'
    | 'parts-catalog'
    | 'fault-finder'
    | 'route-planning'
    | 'inquiries'
    | 'auto-inventory'
    | 'auto-sites'
    | 'auto-visits-report'
    | 'ai-agent'
    | 'ai-analysis'
    | 'report-edit'
    | 'customer-approval'
    | 'engineer-update'
    | 'part-request';

const NAV_ITEMS: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'tickets', label: '🎫 Tickets' },
    { id: 'pending', label: '📋 Pending List' },
    { id: 'inventory', label: '📦 Inventory' },
    { id: 'eng-parts', label: '🔩 Eng. Parts' },
    { id: 'tasks', label: '✅ Tasks' },
    { id: 'customers', label: '👥 Customers' },
    { id: 'walkin', label: '🚶 Walk-in' },
    { id: 'walkin-report', label: '📊 Walk-in Report' },
    { id: 'courier', label: '🚚 Courier' },
    { id: 'courier-report', label: '📑 Courier Report' },
    { id: 'reports', label: '📈 Reports' },
    { id: 'worklogs', label: '🕒 Work Logs' },
    { id: 'engineers', label: '👷 Engineers' },
    { id: 'master', label: '🗂️ Master Data' },
    { id: 'settings', label: '⚙️ Settings' },
    { id: 'live-map', label: '📍 Live Map' },
    { id: 'attendance', label: '🗓️ Attendance' },
    { id: 'targets', label: '🎯 Targets' },
    { id: 'amc', label: '🔄 AMC' },
    { id: 'feedback', label: '⭐ Feedback' },
    { id: 'profit', label: '💰 Profit' },
    { id: 'weekly-report', label: '📊 Weekly Report' },
    { id: 'sales', label: '💼 Sales' },
    { id: 'parts-catalog', label: '🔩 Parts Catalog' },
    { id: 'fault-finder', label: '🔍 Fault Finder' },
    { id: 'route-planning', label: '🗺️ Route Planning' },
    { id: 'inquiries', label: '🔎 Inquiries' },
    { id: 'auto-inventory', label: '📦 Auto Inventory' },
    { id: 'auto-sites', label: '🏗️ Auto Sites' },
    { id: 'auto-visits-report', label: '📋 Visit Report' },
    { id: 'ai-agent', label: '🤖 Virtual AI Agent' },
    { id: 'ai-analysis', label: '🤖 AI Analysis' },
    { id: 'report-edit', label: '✏️ Report Edit' },
    { id: 'customer-approval', label: '✅ Customer Approval' },
    { id: 'engineer-update', label: '🛠️ Engineer Update' },
    { id: 'part-request', label: '🧰 Part Request' },
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <AdminStats />;
            case 'tickets': return <TicketsScreen />;
            case 'pending': return <PendingListScreen />;
            case 'inventory': return <InventoryScreen />;
            case 'eng-parts': return <EngPartsScreen />;
            case 'tasks': return <TasksScreen />;
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
            case 'live-map': return <LegacySurfaceScreen eyebrow="Operations" title="Live Map" subtitle="The live field map surface from the reference CRM is now exposed in the dashboard." points={['Track active field coverage and technician movement.', 'Keep the route visible behind authenticated access.', 'Use this as the dashboard entry point for field visibility.']} />;
            case 'attendance': return <AttendanceScreen />;
            case 'targets': return <TargetsScreen />;
            case 'amc': return <AMCScreen />;
            case 'feedback': return <FeedbackScreen />;
            case 'profit': return <ProfitScreen />;
            case 'weekly-report': return <WeeklyReportScreen />;
            case 'sales': return <SalesScreen />;
            case 'parts-catalog': return <PartsCatalogScreen />;
            case 'fault-finder': return <FaultFinderScreen />;
            case 'route-planning': return <RoutePlanningScreen />;
            case 'auto-inventory': return <AutoInventoryScreen />;
            case 'auto-sites': return <AutoSitesScreen />;
            case 'auto-visits-report': return <AutoVisitsReportScreen />;
            case 'ai-agent': return <LegacySurfaceScreen eyebrow="AI Agent" title="Virtual AI Agent" subtitle="The AI agent entry point is now visible inside the dashboard." points={['Reserve the agent workspace route.', 'Keep it behind the current auth/session flow.', 'Use it as the integration point for future agent work.']} />;
            case 'ai-analysis': return <LegacySurfaceScreen eyebrow="AI Agent" title="AI Analysis" subtitle="The AI analysis surface remains available as a dashboard route." points={['Show AI-generated summaries and insights.', 'Keep it behind authenticated access.', 'Mirror the reference app’s navigation item.']} />;
            case 'report-edit': return <LegacySurfaceScreen eyebrow="Workflow" title="Report Edit" subtitle="The report edit workflow from the reference app is now surfaced as a dedicated route." points={['Capture edits before approval.', 'Keep the workflow tied to report management.', 'Use the existing CRM shell and auth flow.']} />;
            case 'customer-approval': return <LegacySurfaceScreen eyebrow="Workflow" title="Customer Approval" subtitle="The approval workflow is now represented as a visible route." points={['Review estimate and approval decisions.', 'Keep the route anchored to ticket management.', 'Preserve the original CRM entry point.']} />;
            case 'engineer-update': return <LegacySurfaceScreen eyebrow="Workflow" title="Engineer Update" subtitle="Engineer update actions remain visible in the dashboard." points={['Track status updates and notes from technicians.', 'Keep the route available to authenticated staff.', 'Mirror the original action entry point.']} />;
            case 'part-request': return <LegacySurfaceScreen eyebrow="Workflow" title="Part Request" subtitle="Part requests are now surfaced as a first-class dashboard route." points={['Request and review parts usage.', 'Keep it tied to inventory and engineering flows.', 'Match the legacy workflow location.']} />;
            default: return null;
        }
    };

    return (
        <div className="admin-dashboard">
            <div className="dashboard-sidebar">
                <nav className="dashboard-nav">
                    <h2>Admin Menu</h2>
                    <ul>
                        {NAV_ITEMS.map(item => (
                            <li key={item.id}>
                                <button
                                    className={activeTab === item.id ? 'active' : ''}
                                    onClick={() => setActiveTab(item.id)}
                                >
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
            <div className="dashboard-content">
                {renderContent()}
            </div>
        </div>
    );
}