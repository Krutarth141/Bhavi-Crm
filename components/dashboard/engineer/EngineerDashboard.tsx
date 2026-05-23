'use client';

import { useState } from 'react';
import TicketsScreen from '@/components/screens/TicketsScreen';
import TasksScreen from '@/components/screens/TasksScreen';
import ReportsScreen from '@/components/screens/ReportsScreen';

type EngineerTab = 'tasks' | 'tickets' | 'reports' | 'performance';

export default function EngineerDashboard() {
    const [activeTab, setActiveTab] = useState<EngineerTab>('tasks');


    return (
        <div className="engineer-dashboard">
            <div className="dashboard-sidebar">
                <nav className="dashboard-nav">
                    <h2>Engineer Menu</h2>
                    <ul>
                        <li>
                            <button
                                className={activeTab === 'tasks' ? 'active' : ''}
                                onClick={() => setActiveTab('tasks')}
                            >
                                📋 My Tasks
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'tickets' ? 'active' : ''}
                                onClick={() => setActiveTab('tickets')}
                            >
                                🎫 My Tickets
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'reports' ? 'active' : ''}
                                onClick={() => setActiveTab('reports')}
                            >
                                📈 My Reports
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>

            <div className="dashboard-content">
                {activeTab === 'tasks' && <TasksScreen />}
                {activeTab === 'tickets' && <TicketsScreen />}
                {activeTab === 'reports' && <ReportsScreen />}
            </div>
        </div>
    );
}
