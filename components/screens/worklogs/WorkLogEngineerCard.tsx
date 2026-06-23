import React from 'react';
import { WorkLog } from '@/types/workLogs';

interface Props {
    engName: string;
    dateMap: Record<string, WorkLog[]>;
}

export default function WorkLogEngineerCard({ engName, dateMap }: Props) {
    const allLogs = Object.values(dateMap).flat();
    const totalEntries = allLogs.length;
    const totalDays = Object.keys(dateMap).length;

    const firstLog = allLogs[0] ?? null;
    const isWC = firstLog?.member_role === 'WC';

    const initials = engName
        .split(' ')
        .map((x) => x[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const avatarBg = isWC ? '#7c3aed' : 'var(--primary)';

    const sortedDates = Object.entries(dateMap).sort(([a], [b]) =>
        b.localeCompare(a)
    );

    return (
        <div className="card" style={{ marginBottom: 14 }}>
            {/* Engineer header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 14,
                    paddingBottom: 10,
                    borderBottom: '1px solid var(--border)',
                }}
            >
                <div
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: avatarBg,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    {initials}
                </div>

                <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{engName}</div>
                    <div
                        style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        {isWC ? (
                            <span
                                className="badge"
                                style={{ background: '#ede9fe', color: '#7c3aed' }}
                            >
                                🎯 WC
                            </span>
                        ) : (
                            <span
                                className="badge"
                                style={{ background: '#d1fae5', color: '#065f46' }}
                            >
                                👷 Engineer
                            </span>
                        )}
                        &nbsp;{totalDays} days | {totalEntries} entries
                    </div>
                </div>
            </div>

            {/* Date groups */}
            {sortedDates.map(([date, entries]) => (
                <WorkLogDateGroup key={date} date={date} entries={entries} />
            ))}
        </div>
    );
}

function WorkLogDateGroup({
    date,
    entries,
}: {
    date: string;
    entries: WorkLog[];
}) {
    const dObj = new Date(`${date}T00:00:00`);
    const dLabel = dObj.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <div style={{ marginBottom: 14 }}>
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    marginBottom: 8,
                    padding: '4px 10px',
                    background: '#eff6ff',
                    borderRadius: 6,
                    display: 'inline-block',
                }}
            >
                📅 {dLabel}
            </div>

            {entries.map((log, i) => (
                <WorkLogEntry key={log.id ?? i} log={log} />
            ))}
        </div>
    );
}

function WorkLogEntry({ log }: { log: WorkLog }) {
    const isOpen = log.to_time === 'OPEN';
    const isTravel = log.log_type === 'travel';

    const borderColor = isTravel ? '#f59e0b' : isOpen ? '#10b981' : 'var(--primary)';
    const timeBg = isTravel ? '#fef3c7' : isOpen ? '#d1fae5' : '#ede9fe';
    const timeColor = isTravel ? '#92400e' : isOpen ? '#065f46' : '#4c1d95';
    const timeLabel = `${log.from_time} – ${isOpen ? 'Running ⏳' : log.to_time}`;

    return (
        <div
            style={{
                display: 'flex',
                gap: 10,
                padding: '8px 10px',
                background: '#f8fafc',
                borderRadius: 8,
                marginBottom: 6,
                borderLeft: `3px solid ${borderColor}`,
            }}
        >
            <div
                style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: timeColor,
                    background: timeBg,
                    padding: '3px 8px',
                    borderRadius: 99,
                    whiteSpace: 'nowrap',
                }}
            >
                {timeLabel}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                {log.task_description}
            </div>
        </div>
    );
}