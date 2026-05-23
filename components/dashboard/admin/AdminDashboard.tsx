'use client';

import { useState, useEffect } from 'react';
import AdminUserManagement from './AdminUserManagement';
import AdminStats from './AdminStats';
import TicketsScreen from '@/components/screens/TicketsScreen';
import InventoryScreen from '@/components/screens/InventoryScreen';
import TasksScreen from '@/components/screens/TasksScreen';
import CustomersScreen from '@/components/screens/CustomersScreen';
import ReportsScreen from '@/components/screens/ReportsScreen';
import MasterDataScreen from '@/components/screens/MasterDataScreen';
import SettingsScreen from '@/components/screens/SettingsScreen';
import '@/styles/dashboard.css';

type AdminTab = 'overview' | 'tickets' | 'inventory' | 'tasks' | 'customers' | 'reports' | 'master' | 'users' | 'settings';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');

    return (
        <div className="admin-dashboard">
            <div className="dashboard-sidebar">
                <nav className="dashboard-nav">
                    <h2>Admin Menu</h2>
                    <ul>
                        <li>
                            <button
                                className={activeTab === 'overview' ? 'active' : ''}
                                onClick={() => setActiveTab('overview')}
                            >
                                📊 Overview
                            </button>
                        </li>
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
                                className={activeTab === 'inventory' ? 'active' : ''}
                                onClick={() => setActiveTab('inventory')}
                            >
                                📦 Inventory
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
                        <li>
                            <button
                                className={activeTab === 'master' ? 'active' : ''}
                                onClick={() => setActiveTab('master')}
                            >
                                🗂️ Master Data
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'users' ? 'active' : ''}
                                onClick={() => setActiveTab('users')}
                            >
                                👤 User Management
                            </button>
                        </li>
                        <li>
                            <button
                                className={activeTab === 'settings' ? 'active' : ''}
                                onClick={() => setActiveTab('settings')}
                            >
                                ⚙️ Settings
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>

            <div className="dashboard-content">
                {activeTab === 'overview' && <AdminStats />}
                {activeTab === 'tickets' && <TicketsScreen />}
                {activeTab === 'inventory' && <InventoryScreen />}
                {activeTab === 'tasks' && <TasksScreen />}
                {activeTab === 'customers' && <CustomersScreen />}
                {activeTab === 'reports' && <ReportsScreen />}
                {activeTab === 'master' && <MasterDataScreen />}
                {activeTab === 'users' && <AdminUserManagement />}
                {activeTab === 'settings' && <SettingsScreen />}
            </div>
        </div>
    );
}
