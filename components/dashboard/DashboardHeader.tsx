'use client';

import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';

export default function DashboardHeader() {
    const { data: session } = useSession();
    const rawRole = (session?.user as any)?.roleType || (session?.user as any)?.role || 'User';
    const roleLabel = rawRole
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char: string) => char.toUpperCase());

    const handleLogout = async () => {
        await signOut({ redirect: true, callbackUrl: '/login' });
    };

    return (
        <header className="dashboard-header">
            <div className="header-content">
                <h1>BHAVI CRM</h1>
                <div className="user-info">
                    <span className="user-name">{session?.user?.name}</span>
                    <span className="user-role">{roleLabel}</span>
                    <button onClick={handleLogout} className="logout-btn">
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}
