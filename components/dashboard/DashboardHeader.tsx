'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import SiteVisitTracker from '@/components/screens/site-visit/SiteVisitTracker';
import { fetchCompanyInfo } from '@/services/settingsService';

export default function DashboardHeader() {
    const { data: session } = useSession();
    const rawRole = (session?.user as any)?.roleType || (session?.user as any)?.role || 'User';
    const roleLabel = rawRole
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char: string) => char.toUpperCase());

    // index.html:1268-1269 — #topbar-logo shows the uploaded company logo
    // (max-height 40px) once one is set, falling back to the plain "BHAVI
    // CRM" text otherwise.
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    useEffect(() => { fetchCompanyInfo().then(ci => setLogoUrl(ci?.logo_url || null)).catch(() => { }); }, []);

    const handleLogout = async () => {
        await signOut({ redirect: true, callbackUrl: '/login' });
    };

    return (
        <header className="dashboard-header">
            <div className="header-content">
                {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" style={{ maxHeight: 40, maxWidth: 110, objectFit: 'contain' }} />
                ) : (
                    <h1>BHAVI CRM</h1>
                )}
                <div className="user-info">
                    <SiteVisitTracker />
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