import React from 'react';
import { WorkLogStats } from '@/types/workLogs';

interface Props {
    stats: WorkLogStats;
}

export default function WorkLogStatsCards({ stats }: Props) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                marginBottom: 14,
            }}
        >
            <div className="kpi-card" style={{ padding: 12 }}>
                <div className="kpi-label">Total Entries</div>
                <div className="kpi-value">{stats.totalEntries}</div>
            </div>

            <div className="kpi-card" style={{ padding: 12, borderColor: '#0e9f6e' }}>
                <div className="kpi-label">Engineers</div>
                <div className="kpi-value" style={{ color: '#0e9f6e' }}>
                    {stats.totalEngineers}
                </div>
            </div>

            <div className="kpi-card" style={{ padding: 12, borderColor: '#7c3aed' }}>
                <div className="kpi-label">Days</div>
                <div className="kpi-value" style={{ color: '#7c3aed' }}>
                    {stats.totalDays}
                </div>
            </div>
        </div>
    );
}