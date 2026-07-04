'use client';

import { useState } from 'react';

// Existing screens
import TasksScreen from '@/components/screens/TasksScreen';
import TicketsScreen from '@/components/screens/TicketsScreen';
import ReportsScreen from '@/components/screens/ReportsScreen';

// New screens
import MyCallsScreen from '@/components/screens/MyCallsScreen';
import EngPartsScreen from '@/components/screens/EngPartsScreen';

type EngineerTab = 'my-calls' | 'tasks' | 'tickets' | 'eng-parts' | 'reports';

const NAV_ITEMS: { id: EngineerTab; label: string }[] = [
    { id: 'my-calls', label: '📞 My Calls' },
    { id: 'tasks', label: '📋 My Tasks' },
    { id: 'tickets', label: '🎫 My Tickets' },
    { id: 'eng-parts', label: '🔩 Eng. Parts' },
    { id: 'reports', label: '📈 My Reports' },
];

export default function EngineerDashboard() {
    const [activeTab, setActiveTab] = useState<EngineerTab>('my-calls');

    const renderContent = () => {
        switch (activeTab) {
            case 'my-calls': return <MyCallsScreen />;
            case 'tasks': return <TasksScreen />;
            case 'tickets': return <TicketsScreen />;
            case 'eng-parts': return <EngPartsScreen />;
            case 'reports': return <ReportsScreen />;
            default: return null;
        }
    };

    return (
        <div className="engineer-dashboard">
            <div className="dashboard-sidebar">
                <nav className="dashboard-nav">
                    <h2>Engineer Menu</h2>
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