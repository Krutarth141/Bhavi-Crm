import React from 'react';
import { WorkLog, PeonTaskLog } from '@/types/workLogs';

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
    // A "status" entry has a single timestamp, not a from–to range — either
    // explicitly log_type='status', or a work entry whose from/to happen to
    // match (matches HTML's isStatus detection).
    const isStatus = log.log_type === 'status' || (log.log_type === 'work' && log.from_time === log.to_time && !!log.from_time && log.to_time !== 'OPEN');
    const isToday = log.log_date === new Date().toLocaleDateString('en-CA');

    const borderColor = isStatus ? '#10b981' : isTravel ? '#f59e0b' : isOpen ? '#10b981' : 'var(--primary)';
    const timeBg = isStatus ? '#d1fae5' : isTravel ? '#fef3c7' : isOpen ? '#d1fae5' : '#ede9fe';
    const timeColor = isStatus ? '#065f46' : isTravel ? '#92400e' : isOpen ? '#065f46' : '#4c1d95';
    const timeLabel = isStatus
        ? log.from_time
        : isOpen
            ? (isToday ? `${log.from_time} – Running ⏳` : log.from_time)
            : `${log.from_time} – ${log.to_time}`;

    const areaBadge = log.service_type === 'Carry In'
        ? <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>📦 Carry In</span>
        : log.area
            ? <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#0d9488' }}>📍 {log.area}</span>
            : null;

    // Call Closed / Resolved By Phone — link to the exact GPS spot captured
    // when the engineer closed the call.
    const isCloseEntry = !!log.task_description && (log.task_description.indexOf('Call Closed') !== -1 || log.task_description.indexOf('Resolved By Phone') !== -1);
    const gpsLink = (isCloseEntry && log.close_lat != null && log.close_lng != null) ? (
        <a
            href={`https://maps.google.com/?q=${log.close_lat},${log.close_lng}`}
            target="_blank" rel="noreferrer"
            title={`Open closing location in Google Maps${log.close_accuracy ? ` (±${Math.round(log.close_accuracy)}m)` : ''}`}
            style={{ marginLeft: 6, color: '#dc2626', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
            📍 Location
        </a>
    ) : null;

    // Traveling entry that has ended = the engineer reached — link to the
    // arrival-KM location captured for that call.
    const arrivalLink = (isTravel && !isOpen && log.arrival_lat != null && log.arrival_lng != null) ? (
        <a
            href={`https://maps.google.com/?q=${log.arrival_lat},${log.arrival_lng}`}
            target="_blank" rel="noreferrer"
            title={`Open reached location in Google Maps${log.arrival_accuracy ? ` (±${Math.round(log.arrival_accuracy)}m)` : ''}`}
            style={{ marginLeft: 6, color: '#2563eb', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
            📍 Reached
        </a>
    ) : null;

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
                {log.task_description}{areaBadge}{gpsLink}{arrivalLink}
            </div>
        </div>
    );
}

// ─── Peon task-log card (matches HTML's isPeonSel branch) ──────────────────

export function WorkLogPeonCard({ peonName, dateMap }: { peonName: string; dateMap: Record<string, PeonTaskLog[]> }) {
    const initials = peonName
        .split(' ')
        .map((x) => x[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const sortedDates = Object.entries(dateMap).sort(([a], [b]) => b.localeCompare(a));

    return (
        <div className="card" style={{ marginBottom: 14 }}>
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
                        background: '#d97706',
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
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{peonName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>🧹 Office Boy</span>
                    </div>
                </div>
            </div>

            {sortedDates.map(([date, entries]) => (
                <WorkLogPeonDateGroup key={date} date={date} entries={entries} />
            ))}
        </div>
    );
}

function WorkLogPeonDateGroup({ date, entries }: { date: string; entries: PeonTaskLog[] }) {
    const dObj = new Date(`${date}T00:00:00`);
    const dLabel = dObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div style={{ marginBottom: 14 }}>
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#d97706',
                    marginBottom: 8,
                    padding: '4px 10px',
                    background: '#fef3c7',
                    borderRadius: 6,
                    display: 'inline-block',
                }}
            >
                📅 {dLabel}
            </div>

            {entries.map((log, i) => (
                <WorkLogPeonEntry key={log.id ?? i} log={log} />
            ))}
        </div>
    );
}

function WorkLogPeonEntry({ log }: { log: PeonTaskLog }) {
    const isExtra = !!log.task_name && log.task_name.startsWith('extra_');
    const timeStr = log.done_at ? new Date(log.done_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
    const extraTime = log.extra_from ? (log.extra_from + (log.extra_to ? ` → ${log.extra_to}` : '')) : '';
    const borderColor = isExtra ? '#6366f1' : '#d97706';
    const timeBg = isExtra ? '#ede9fe' : '#fef3c7';
    const timeColor = isExtra ? '#4338ca' : '#92400e';
    const timeLabel = isExtra ? (extraTime || 'Extra Work') : timeStr;

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
                {isExtra ? '📝 ' : ''}{log.task_label || log.task_name}
            </div>
        </div>
    );
}