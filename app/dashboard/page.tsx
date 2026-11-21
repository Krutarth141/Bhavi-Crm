'use client';

import { signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deviceCall, getDeviceId } from '@/lib/deviceSecurity';
import AdminDashboard from '@/components/dashboard/admin/AdminDashboard';
import EngineerDashboard from '@/components/dashboard/engineer/EngineerDashboard';
import WorkControllerDashboard from '@/components/dashboard/work-controller/WorkControllerDashboard';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import PeonDashboard from '@/components/dashboard/peon/PeonDashboard';
import TATReminder from '@/components/TATReminder';

export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.email) return;

        const checkBlocked = async () => {
            const result = await deviceCall({
                action: 'status',
                user_id: session.user.email,
                device_id: getDeviceId(),
            }, 5000);
            if (result?.status === 'blocked') {
                alert('🚫 This device has been blocked. Please contact the Admin.');
                await signOut({ redirect: true, callbackUrl: '/login' });
            }
        };

        void checkBlocked();
        const timer = window.setInterval(() => void checkBlocked(), 60000);
        const onVisibility = () => {
            if (!document.hidden) void checkBlocked();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [status, session?.user?.email]);

    if (status === 'loading') {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading dashboard...</div>;
    }

    if (!session) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Redirecting to login...</div>;
    }

    const userRole = (session.user as typeof session.user & { roleType?: string }).roleType;

    const renderDashboard = () => {
        switch (userRole) {
            case 'admin':
                return <AdminDashboard />;
            case 'work_controller':
                return <WorkControllerDashboard />;
            case 'engineer':
                return <EngineerDashboard />;
            case 'peon':
                return <PeonDashboard />;
            default:
                return <div style={{ padding: '20px' }}>Unknown role: {userRole}</div>;
        }
    };

    return (
        <div>
            <DashboardHeader />
            <TATReminder />
            {renderDashboard()}
        </div>
    );
}
