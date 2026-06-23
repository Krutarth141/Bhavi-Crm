import React from 'react';
import { WorkLogFilters, WorkLogMember } from '@/types/workLogs';

interface Props {
    filters: WorkLogFilters;
    members: WorkLogMember[];
    membersLoading: boolean;
    onFilterChange: (f: WorkLogFilters) => void;
    onSearch: () => void;
    onExcelDownload: () => void;
}

export default function WorkLogFilterPanel({
    filters,
    members,
    membersLoading,
    onFilterChange,
    onSearch,
    onExcelDownload,
}: Props) {
    const set = (key: keyof WorkLogFilters, value: string) =>
        onFilterChange({ ...filters, [key]: value });

    return (
        <div className="card" style={{ marginBottom: 14 }}>
            <div className="section-header">
                <h2>🔍 Filter Work Logs</h2>
            </div>

            <div className="form-grid" style={{ marginBottom: 14 }}>
                <div className="form-group">
                    <label>Date From</label>
                    <input
                        type="date"
                        value={filters.from}
                        onChange={(e) => set('from', e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <div className="form-group">
                    <label>Date To</label>
                    <input
                        type="date"
                        value={filters.to}
                        onChange={(e) => set('to', e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <div className="form-group">
                    <label>Member (Engineer / WC)</label>
                    <select
                        value={filters.engId}
                        onChange={(e) => set('engId', e.target.value)}
                        style={inputStyle}
                        disabled={membersLoading}
                    >
                        <option value="">All Members</option>
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name} ({m.role})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={onSearch}>
                    🔍 Search
                </button>
                <button className="btn btn-success" onClick={onExcelDownload}>
                    📊 Excel Download
                </button>
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
};