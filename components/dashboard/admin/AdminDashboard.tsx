'use client';

import { useState } from 'react';
import AdminStats from './AdminStats';
import AdminUserManagement from './AdminUserManagement';

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
import LiveMapScreen from '@/components/screens/LiveMapScreen';
import CustomerApprovalScreen from '@/components/screens/CustomerApprovalScreen';
import EngineerUpdateScreen from '@/components/screens/EngineerUpdateScreen';
import PartRequestScreen from '@/components/screens/PartRequestScreen';
import ReportEditScreen from '@/components/screens/ReportEditScreen';
import AIAgentScreen from '@/components/screens/AIAgentScreen';
import AIAnalysisScreen from '@/components/screens/AIAnalysisScreen';

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
            case 'live-map': return <LiveMapScreen />;
            case 'inquiries': return <InquiriesScreen />;
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
            case 'ai-agent': return <AIAgentScreen />;
            case 'ai-analysis': return <AIAnalysisScreen />;
            case 'report-edit': return <ReportEditScreen />;
            case 'customer-approval': return <CustomerApprovalScreen />;
            case 'engineer-update': return <EngineerUpdateScreen />;
            case 'part-request': return <PartRequestScreen />;
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