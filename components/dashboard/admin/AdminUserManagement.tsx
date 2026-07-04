'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppUser, UserFormData } from '@/types/users';
import { useUsers } from '@/hooks/useUsers';

// User management sub-components
import EngineersTab from './user-management/EngineersTab';
import WorkControllersTab from './user-management/WorkControllersTab';
import AdminProfileTab from './user-management/AdminProfileTab';
import LogoTab from './user-management/LogoTab';
import UserFormModal from './user-management/UserFormModal';

// New settings tabs
import ShiftSettingsCard from './user-management/ShiftSettingsCard';
import MSCCentersTab from './user-management/MSCCentersTab';
import PortalServicesTab from './user-management/PortalServicesTab';
import TelegramTab from './user-management/TelegramTab';

type TabId = 'engineers' | 'wc' | 'admin' | 'logo' | 'company' | 'portal' | 'msc' | 'telegram';

const TABS: { id: TabId; label: string }[] = [
    { id: 'engineers', label: '👷 Engineers' },
    { id: 'wc', label: '🎯 Work Controllers' },
    { id: 'admin', label: '👑 Admin Profile' },
    { id: 'logo', label: '🖼️ Logo' },
    { id: 'company', label: '🏢 Company Info' },
    { id: 'portal', label: '🌐 Portal Services' },
    { id: 'msc', label: '📊 MSC Centers' },
    { id: 'telegram', label: '📱 Telegram' },
];

export default function AdminUserManagement() {
    const { data: session } = useSession();
    const currentUserId = (session?.user as any)?.id;
    const currentUserName = (session?.user as any)?.name ?? '';

    const {
        engineers, workControllers,
        loading, error,
        addUser, editUser, toggleActive, removeUser, updatePassword,
    } = useUsers();

    const [activeTab, setActiveTab] = useState<TabId>('engineers');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AppUser | null>(null);
    const [modalType, setModalType] = useState<'engineer' | 'wc'>('engineer');
    const [feedback, setFeedback] = useState('');

    const showFeedback = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(''), 3000);
    };

    const openAdd = (type: 'engineer' | 'wc') => {
        setModalType(type);
        setEditingUser(null);
        setModalOpen(true);
    };

    const openEdit = (user: AppUser) => {
        setModalType(user.role_type === 'work_controller' ? 'wc' : 'engineer');
        setEditingUser(user);
        setModalOpen(true);
    };

    const handleSave = async (form: UserFormData, id?: number) => {
        if (id) await editUser(id, form);
        else await addUser(form);
        showFeedback(id ? 'Updated successfully!' : 'Created successfully!');
    };

    const handleToggle = async (user: AppUser) => {
        const action = user.is_active ? 'Deactivate' : 'Activate';
        if (!confirm(`${action} "${user.name}"?`)) return;
        try { await toggleActive(user.id, !user.is_active); }
        catch (e: any) { alert(e.message); }
    };

    const handleDelete = async (user: AppUser) => {
        if (!confirm(`Delete "${user.name}"? This cannot be undone.`)) return;
        try { await removeUser(user.id); showFeedback('Deleted!'); }
        catch (e: any) { alert(e.message); }
    };

    const handlePasswordChange = async (password: string) => {
        await updatePassword(currentUserId, password);
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'engineers':
                return (
                    <EngineersTab
                        engineers={engineers} loading={loading}
                        onAdd={() => openAdd('engineer')}
                        onEdit={openEdit} onToggle={handleToggle} onDelete={handleDelete}
                    />
                );
            case 'wc':
                return (
                    <WorkControllersTab
                        workControllers={workControllers} loading={loading}
                        onAdd={() => openAdd('wc')}
                        onEdit={openEdit} onToggle={handleToggle} onDelete={handleDelete}
                    />
                );
            case 'admin':
                return <AdminProfileTab currentUserName={currentUserName} onChangePassword={handlePasswordChange} />;
            case 'logo':
            case 'company':
                return <LogoTab />;
            case 'portal':
                return <PortalServicesTab />;
            case 'msc':
                return <MSCCentersTab />;
            case 'telegram':
                return <TelegramTab />;
            default:
                return null;
        }
    };

    return (
        <div className="screen-container">
            <h2 style={{ margin: '0 0 18px' }}>⚙️ Settings</h2>

            {/* Shift Settings Card — always on top */}
            <ShiftSettingsCard />

            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{error}</div>}
            {feedback && <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 14px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{feedback}</div>}

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {renderTab()}

            {/* Add/Edit Modal */}
            <UserFormModal
                isOpen={modalOpen}
                editingUser={editingUser}
                modalType={modalType}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    );
}