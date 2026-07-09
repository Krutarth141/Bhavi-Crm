'use client';

import { useState } from 'react';

// Existing screens
import TasksScreen from '@/components/screens/TasksScreen';
import TicketsScreen from '@/components/screens/TicketsScreen';
import ReportsScreen from '@/components/screens/ReportsScreen';

// New screens
import MyCallsScreen from '@/components/screens/MyCallsScreen';
import EngPartsScreen from '@/components/screens/EngPartsScreen';
import EngineerUpdateScreen from '@/components/screens/EngineerUpdateScreen';

type EngineerTab = 'my-calls' | 'tasks' | 'tickets' | 'eng-parts' | 'reports' | 'engineer-update';

const NAV_ITEMS: { id: EngineerTab; label: string }[] = [
    { id: 'my-calls', label: '📞 My Calls' },
    { id: 'tasks', label: '📋 My Tasks' },
    { id: 'tickets', label: '🎫 My Tickets' },
    { id: 'eng-parts', label: '🔩 Eng. Parts' },
    { id: 'reports', label: '📈 My Reports' },
    { id: 'engineer-update', label: '🛠️ Engineer Update' },
];

export default function EngineerDashboard() {
    const [activeTab, setActiveTab] = useState<EngineerTab>('my-calls');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleNavClick = (id: EngineerTab) => {
        setActiveTab(id);
        setSidebarOpen(false);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'my-calls': return <MyCallsScreen />;
            case 'tasks': return <TasksScreen />;
            case 'tickets': return <TicketsScreen />;
            case 'eng-parts': return <EngPartsScreen />;
            case 'reports': return <ReportsScreen />;
            case 'engineer-update': return <EngineerUpdateScreen />;
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
                        <h2 style={{ margin: 0 }}>Engineer Menu</h2>
                        <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
                    </div>
                    <ul>
                        {NAV_ITEMS.map(item => (
                            <li key={item.id}>
                                <button
                                    className={activeTab === item.id ? 'active' : ''}
                                    onClick={() => handleNavClick(item.id)}
                                >
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
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

        </div>
    );
}