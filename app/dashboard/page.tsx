'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import AdminDashboard from '@/components/dashboard/admin/AdminDashboard';
import EngineerDashboard from '@/components/dashboard/engineer/EngineerDashboard';
import WorkControllerDashboard from '@/components/dashboard/work-controller/WorkControllerDashboard';
import '@/styles/dashboard.css';

function DashboardContent() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    const userRole = (session?.user as any)?.role || 'engineer';

    const renderDashboard = () => {
        switch (userRole) {
            case 'admin':
                return <AdminDashboard />;
            case 'work_controller':
                return <WorkControllerDashboard />;
            case 'engineer':
            default:
                return <EngineerDashboard />;
        }
    };

    return (
        <div className="dashboard-container">
            <DashboardHeader />
            <main className="dashboard-main">{renderDashboard()}</main>
        </div>
    );
}

export default function Dashboard() {
    return <DashboardContent />;
}
