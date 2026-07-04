'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/dashboard/admin/AdminDashboard';
import EngineerDashboard from '@/components/dashboard/engineer/EngineerDashboard';
import WorkControllerDashboard from '@/components/dashboard/work-controller/WorkControllerDashboard';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [status, router]);

    if (status === 'loading') {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading dashboard...</div>;
    }

    if (!session) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Redirecting to login...</div>;
    }

    const userRole = (session.user as any)?.roleType;

    const renderDashboard = () => {
        switch (userRole) {
            case 'admin':
                return <AdminDashboard />;
            case 'work_controller':
                return <WorkControllerDashboard />;
            case 'engineer':
                return <EngineerDashboard />;
            default:
                return <div style={{ padding: '20px' }}>Unknown role: {userRole}</div>;
        }
    };

    return (
        <div>
            <DashboardHeader />
            {renderDashboard()}
        </div>
    );
}
