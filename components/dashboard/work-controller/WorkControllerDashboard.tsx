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
    | 'tickets'
    | 'pending'
    | 'tasks'
    | 'customers'
    | 'walkin'
    | 'walkin-report'
    | 'courier'
    | 'courier-report'
    | 'reports'
    | 'inquiries'
    | 'attendance';

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
            <div className="dashboard-sidebar">
                <nav className="dashboard-nav">
                    <h2>Work Controller Menu</h2>
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