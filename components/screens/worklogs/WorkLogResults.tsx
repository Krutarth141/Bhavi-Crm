import React from 'react';
import { WorkLogsByEngineer, WorkLogStats } from '@/types/workLogs';
import WorkLogStatsCards from './WorkLogStatsCards';
import WorkLogEngineerCard from './WorkLogEngineerCard';

interface Props {
    loading: boolean;
    error: string | null;
    grouped: WorkLogsByEngineer;
    stats: WorkLogStats;
    searched: boolean;
}

export default function WorkLogResults({ loading, error, grouped, stats, searched }: Props) {
    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="alert alert-warning">Error: {error}</div>;
    }

    if (!searched) return null;

    const engineers = Object.entries(grouped);

    if (!engineers.length) {
        return (
            <div className="alert alert-info">
                No work logs found for selected filters.
            </div>
        );
    }

    return (
        <div>
            <WorkLogStatsCards stats={stats} />
            {engineers.map(([engName, dateMap]) => (
                <WorkLogEngineerCard key={engName} engName={engName} dateMap={dateMap} />
            ))}
        </div>
    );
}