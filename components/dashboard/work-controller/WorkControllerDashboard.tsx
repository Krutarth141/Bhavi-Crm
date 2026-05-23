'use client';

import { useState } from 'react';
import TicketsScreen from '@/components/screens/TicketsScreen';
import TasksScreen from '@/components/screens/TasksScreen';
import CustomersScreen from '@/components/screens/CustomersScreen';
import ReportsScreen from '@/components/screens/ReportsScreen';

type WorkControllerTab = 'tasks' | 'tickets' | 'customers' | 'reports';

export default function WorkControllerDashboard() {
    const [activeTab, setActiveTab] = useState<WorkControllerTab>('tasks');

    return (
        <div className="work-controller-dashboard">
            <div className="dashboard-sidebar">
                <nav className="dashboard-nav">
                    <h2>Work Controller Menu</h2>
                    <ul>
                        <li>
                            <button
                                className={activeTab === 'tickets' ? 'active' : ''}
                                onClick={() => setActiveTab('tickets')}
                            >
                                🎫 Tickets
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'tasks' ? 'active' : ''}
                                onClick={() => setActiveTab('tasks')}
                            >
                                ✅ Tasks
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'customers' ? 'active' : ''}
                                onClick={() => setActiveTab('customers')}
                            >
                                👥 Customers
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'reports' ? 'active' : ''}
                                onClick={() => setActiveTab('reports')}
                            >
                                📈 Reports
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>

            <div className="dashboard-content">
                {activeTab === 'tickets' && <TicketsScreen />}
                {activeTab === 'tasks' && <TasksScreen />}
                {activeTab === 'customers' && <CustomersScreen />}
                {activeTab === 'reports' && <ReportsScreen />}
            </div>
        </div>
    );
}
