'use client';

import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';

export default function DashboardHeader() {
    const { data: session } = useSession();

    const handleLogout = async () => {
        await signOut({ redirect: true, callbackUrl: '/login' });
    };

    return (
        <header className="dashboard-header">
            <div className="header-content">
                <h1>BHAVI CRM</h1>
                <div className="user-info">
                    <span className="user-name">{session?.user?.name}</span>
                    <span className="user-role">{(session?.user as any)?.role || 'User'}</span>
                    <button onClick={handleLogout} className="logout-btn">
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}
