import React from 'react';
import { WorkLogsByEngineer, WorkLogStats, PeonLogsByPeon } from '@/types/workLogs';
import WorkLogStatsCards from './WorkLogStatsCards';
import WorkLogEngineerCard, { WorkLogPeonCard } from './WorkLogEngineerCard';

interface Props {
    loading: boolean;
    error: string | null;
    grouped: WorkLogsByEngineer;
    peonGrouped: PeonLogsByPeon;
    isPeonMode: boolean;
    stats: WorkLogStats;
    searched: boolean;
}

export default function WorkLogResults({ loading, error, grouped, peonGrouped, isPeonMode, stats, searched }: Props) {
    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="alert alert-warning">Error: {error}</div>;
    }

    if (!searched) return null;

    if (isPeonMode) {
        const peons = Object.entries(peonGrouped);
        if (!peons.length) {
            return <div className="alert alert-info">No task logs found.</div>;
        }
        return (
            <div>
                {peons.map(([peonName, dateMap]) => (
                    <WorkLogPeonCard key={peonName} peonName={peonName} dateMap={dateMap} />
                ))}
            </div>
        );
    }

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