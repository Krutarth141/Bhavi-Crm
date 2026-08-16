'use client';

import React, { useState } from 'react';
import { useWorkLogs, useWorkLogMembers } from '@/hooks/useWorkLogs';
import WorkLogFilterPanel from '@/components/screens/worklogs/WorkLogFilterPanel';
import WorkLogResults from '@/components/screens/worklogs/WorkLogResults';
import { downloadWorkLogExcel } from '@/utils/workLogExcel';

export default function WorkLogScreen() {
    const { members, loading: membersLoading } = useWorkLogMembers();

    const {
        filters,
        setFilters,
        logs,
        grouped,
        peonGrouped,
        isPeonMode,
        stats,
        loading,
        error,
        handleSearch,
    } = useWorkLogs();
    const [searched, setSearched] = useState(true);

    const isPeonSelected = members.find((m) => m.id === filters.engId)?.role === 'Peon';

    const onSearch = () => {
        setSearched(true);
        handleSearch(isPeonSelected);
    };

    const onExcelDownload = () => downloadWorkLogExcel(logs);

    return (
        <div>
            <WorkLogFilterPanel
                filters={filters}
                members={members}
                membersLoading={membersLoading}
                onFilterChange={setFilters}
                onSearch={onSearch}
                onExcelDownload={onExcelDownload}
            />

            <WorkLogResults
                loading={loading}
                error={error}
                grouped={grouped}
                peonGrouped={peonGrouped}
                isPeonMode={isPeonMode}
                stats={stats}
                searched={searched}
            />
        </div>
    );
}