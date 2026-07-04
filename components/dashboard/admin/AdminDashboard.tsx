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
    { id: 'settings', label: '⚙️ Settings' },  // ← was separate User Mgmt + Settings
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
            case 'settings': return <AdminUserManagement />;  // ← handles both
            case 'live-map': return <LegacySurfaceScreen eyebrow="Operations" title="Live Map" subtitle="The live field map surface from the reference CRM is now exposed in the dashboard." points={['Track active field coverage and technician movement.', 'Keep the route visible behind authenticated access.', 'Use this as the dashboard entry point for field visibility.']} />;
            case 'attendance': return <LegacySurfaceScreen eyebrow="Operations" title="Attendance" subtitle="Attendance and shift coverage remain accessible from the admin shell." points={['Review punch history and availability.', 'Keep shift visibility aligned with dashboard settings.', 'Use the same authenticated session as the CRM.']} />;
            case 'targets': return <LegacySurfaceScreen eyebrow="Management" title="Targets" subtitle="Target tracking stays visible as its own admin screen." points={['Monitor goal progress and closure performance.', 'Keep the view tied to reporting data.', 'Expose the route directly in the admin menu.']} />;
            case 'amc': return <LegacySurfaceScreen eyebrow="Service" title="AMC" subtitle="AMC tracking is preserved as a dashboard entry." points={['Manage maintenance contracts and renewals.', 'Link AMC work to ticket and customer history.', 'Keep the same admin access rules.']} />;
            case 'feedback': return <LegacySurfaceScreen eyebrow="Management" title="Feedback" subtitle="Customer feedback now has a dedicated route in the app." points={['Review service comments and satisfaction notes.', 'Tie feedback back to tickets and orders.', 'Use it as a management review surface.']} />;
            case 'profit': return <LegacySurfaceScreen eyebrow="Reports" title="Profit" subtitle="Profit analysis is available as a dashboard route." points={['Review revenue and cost summaries.', 'Keep it within the authenticated reporting stack.', 'Mirror the original navigation item.']} />;
            case 'weekly-report': return <LegacySurfaceScreen eyebrow="Reports" title="Weekly Report" subtitle="Weekly reporting is now visible in the dashboard menu." points={['Summarize weekly operational activity.', 'Stay aligned with the legacy admin sidebar.', 'Use the same session and role checks.']} />;
            case 'sales': return <LegacySurfaceScreen eyebrow="Management" title="Sales" subtitle="Sales tracking remains an admin-only entry point." points={['Review sales-related service totals.', 'Keep the route available under the CRM shell.', 'Match the reference dashboard navigation.']} />;
            case 'parts-catalog': return <LegacySurfaceScreen eyebrow="Inventory" title="Parts Catalog" subtitle="Parts catalog access is surfaced alongside inventory and engineer parts." points={['Review part references and stock identifiers.', 'Keep it tied to the same inventory data layer.', 'Expose the catalog as a first-class dashboard item.']} />;
            case 'fault-finder': return <LegacySurfaceScreen eyebrow="Tools" title="Fault Finder" subtitle="Troubleshooting support is preserved as a utility screen." points={['Help agents narrow device faults quickly.', 'Keep the route under authenticated access.', 'Mirror the legacy utility entry point.']} />;
            case 'route-planning': return <LegacySurfaceScreen eyebrow="Operations" title="Route Planning" subtitle="Route planning stays available as a standalone dashboard surface." points={['Plan the day’s field visit order.', 'Keep it aligned with tickets and courier work.', 'Preserve the original route entry point.']} />;
            case 'inquiries': return <LegacySurfaceScreen eyebrow="Operations" title="Inquiries" subtitle="Inquiry handling remains accessible from the admin shell." points={['Review public questions and request leads.', 'Tie the data back to the service flow.', 'Use the same CRM authentication.']} />;
            case 'auto-inventory': return <LegacySurfaceScreen eyebrow="Automation" title="Auto Inventory" subtitle="Automated inventory surfacing is preserved as an admin route." points={['Show automation-driven inventory signals.', 'Keep it under admin-only access.', 'Mirror the legacy automation menu item.']} />;
            case 'auto-sites': return <LegacySurfaceScreen eyebrow="Automation" title="Auto Sites" subtitle="Automated site monitoring is visible again in the dashboard." points={['Review automated site-related outputs.', 'Keep the route attached to the CRM session.', 'Expose the same reference navigation item.']} />;
            case 'auto-visits-report': return <LegacySurfaceScreen eyebrow="Automation" title="Visit Report" subtitle="Automated visit reporting is available from the admin menu." points={['Review visit summaries and automation results.', 'Keep the route aligned to the legacy sidebar.', 'Treat it as a management report surface.']} />;
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