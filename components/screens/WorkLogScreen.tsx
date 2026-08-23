'use client';

import React, { useState, useEffect } from 'react';
import { useWorkLogs, useWorkLogMembers } from '@/hooks/useWorkLogs';
import WorkLogFilterPanel from '@/components/screens/worklogs/WorkLogFilterPanel';
import WorkLogResults from '@/components/screens/worklogs/WorkLogResults';
import { downloadWorkLogExcel } from '@/utils/workLogExcel';
import { colors, styles } from '@/styles/ticketsStyles';
import { saveWorkLog, deleteWorkLog, fetchWorkLogsByDate } from '@/services/myCallsService';
import { WorkLog } from '@/types/myCalls';
import AIWriteButton from '@/components/shared/AIWriteButton';
import WorkLogShareModal from './WorkLogShareModal';

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

const AUTO_LOG_PREFIXES = [
    '🚗', '🔧', '⏸️', '✅', '📞', '🏢', '🏠', '🏡', '📍',
];

// HTML decides "auto vs manual" purely on the ABSENCE of log_type: its manual
// saveWorkLog() writes no log_type at all, and logsHtml() treats
// log_type==='work'||'travel' as auto (index.html:19024, 19198-19222). This
// port's manual form used to default log_type to 'work', which made every
// hand-typed entry render as "⚡ Auto" with NO delete button — permanently
// undeletable. The manual form no longer writes log_type (matching HTML), and
// the check below additionally requires a real auto marker — a ticket_id /
// site_visit_id link, a still-running OPEN entry, or one of the auto
// task_description prefixes — so rows already written by the old buggy form
// stay deletable too.
export function isAutoWorkLog(log: WorkLog): boolean {
    const lt = log.log_type;
    if (lt !== 'work' && lt !== 'travel') return false;
    if (log.ticket_id || log.site_visit_id) return true;
    if (log.to_time === 'OPEN') return true;
    const d = (log.task_description || '').trim();
    return AUTO_LOG_PREFIXES.some((p) => d.startsWith(p));
}

interface EngineerWorkLogScreenProps {
    engId: string;
    engName: string;
}

export function EngineerWorkLogScreen({ engId, engName }: EngineerWorkLogScreenProps) {
    const today = new Date().toLocaleDateString('en-CA');
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    // Entry form state
    const [wlFrom, setWlFrom] = useState('');
    const [wlTo, setWlTo] = useState('');
    const [wlTask, setWlTask] = useState('');
    const [wlSubmitted, setWlSubmitted] = useState(false);

    // From Time defaults to the END of the day's last log entry (auto or
    // manual) so a fresh entry chains on exactly; To Time defaults to now.
    // A forced 30-minute grid caused gaps/overlaps against auto entries
    // (Visit Start / Work Start), which log at their real minute
    // (index.html:19015-19018, 19045-19047).
    const applyTimeDefaults = (logs: WorkLog[]) => {
        const currExact = new Date().toTimeString().slice(0, 5);
        const last = logs.length ? logs[logs.length - 1] : null;
        setWlFrom(last && last.to_time && last.to_time !== 'OPEN' ? last.to_time : currExact);
        setWlTo(currExact);
    };

    const loadToday = async () => {
        setLoadingLogs(true);
        const r = await fetchWorkLogsByDate(engId, today);
        const logs = r.data || [];
        setWorkLogs(logs);
        applyTimeDefaults(logs);
        setLoadingLogs(false);
    };
    useEffect(() => { if (engId) loadToday(); }, [engId]);
    const [wlSaving, setWlSaving] = useState(false);
    const [shareLogs, setShareLogs] = useState<{ date: string; logs: WorkLog[] } | null>(null);
    const [searchDate, setSearchDate] = useState(today);
    const [searchResults, setSearchResults] = useState<WorkLog[] | null>(null);
    const [searching, setSearching] = useState(false);

    const handleSaveWorkLog = async () => {
        setWlSubmitted(true);
        if (!wlFrom || !wlTo || !wlTask.trim()) return;
        if (wlFrom >= wlTo) { alert('To time must be greater than From time'); return; }
        setWlSaving(true);
        // Deliberately NO log_type — HTML's manual saveWorkLog() writes none
        // (index.html:19205-19216), and that absence is exactly what marks the
        // entry as hand-typed (and therefore deletable) instead of automatic.
        const result = await saveWorkLog({
            eng_id: engId,
            eng_name: engName,
            member_role: 'Engineer',
            log_date: today,
            from_time: wlFrom,
            to_time: wlTo,
            task_description: wlTask.trim(),
        });
        setWlSaving(false);
        if (result.success) {
            setWlTask(''); setWlSubmitted(false);
            await loadToday();
        } else {
            alert('❌ ' + result.error);
        }
    };

    const handleDeleteWorkLog = async (id: string) => {
        if (!confirm('Delete this work log entry?')) return;
        const result = await deleteWorkLog(id);
        if (result.success) await loadToday();
        else alert('❌ ' + result.error);
    };

    const handleSearchLogs = async () => {
        setSearching(true);
        const r = await fetchWorkLogsByDate(engId, searchDate);
        setSearchResults(r.data || []);
        setSearching(false);
    };

    // Header banner date string — mirrors HTML's dateStr ("17th August 2026,
    // Monday") built with an ordinal day suffix (index.html:19003-19007).
    const now = new Date();
    const dd = now.getDate();
    const suffix = dd === 1 || dd === 21 || dd === 31 ? 'st' : dd === 2 || dd === 22 ? 'nd' : dd === 3 || dd === 23 ? 'rd' : 'th';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const wdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const headerDateStr = `${dd}${suffix} ${months[now.getMonth()]} ${now.getFullYear()}, ${wdays[now.getDay()]}`;

    return (
        <div style={{ padding: '20px', backgroundColor: colors.bg, minHeight: '100vh' }}>
            {/* Header banner — mirrors HTML's renderWorkLog() banner (index.html:19031-19034).
                HTML has no share button here at all — the only Share button is
                below, in the Today's Logs section, and only when it has entries. */}
            <div style={{ background: '#1e2a3a', borderRadius: 12, padding: '16px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📋</div>
                <div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Work Log — {engName}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{headerDateStr}</div>
                </div>
            </div>

            {/* Add Work Log Entry */}
            <div style={{ ...styles.card, marginBottom: '20px' }}>
                <div style={{ ...styles.sectionTitle, fontSize: '15px', marginBottom: '14px' }}>➕ Add Work Log Entry</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>From Time</label>
                        <input
                            type="time" value={wlFrom} onChange={(e) => setWlFrom(e.target.value)}
                            style={{ ...styles.formInput, borderColor: wlSubmitted && !wlFrom ? colors.danger : colors.border }}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>To Time</label>
                        <input
                            type="time" value={wlTo} onChange={(e) => setWlTo(e.target.value)}
                            style={{ ...styles.formInput, borderColor: wlSubmitted && !wlTo ? colors.danger : colors.border }}
                        />
                    </div>
                </div>
                <div style={{ ...styles.formGroup, marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={styles.formLabel}>Task Description *</label>
                        <AIWriteButton type="worklog" onInsert={(text) => setWlTask(text)} />
                    </div>
                    <input
                        type="text" placeholder="What did you work on?" value={wlTask} onChange={(e) => setWlTask(e.target.value)}
                        style={{ ...styles.formInput, borderColor: wlSubmitted && !wlTask.trim() ? colors.danger : colors.border }}
                    />
                    {wlSubmitted && !wlTask.trim() && (
                        <span style={{ fontSize: '11px', color: colors.danger, marginTop: '2px' }}>Task description is required.</span>
                    )}
                </div>
                <button
                    onClick={handleSaveWorkLog} disabled={wlSaving}
                    style={{ ...styles.btn, ...styles.btnPrimary, opacity: wlSaving ? 0.6 : 1, cursor: wlSaving ? 'not-allowed' : 'pointer' }}
                >
                    {wlSaving ? '⏳ Saving...' : '💾 Save Entry'}
                </button>
            </div>

            {/* Today's Work Log */}
            <div style={{ ...styles.card, marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ ...styles.sectionTitle, fontSize: '15px' }}>🗒️ Today's Work Log</div>
                    {workLogs.length > 0 && (
                        <button
                            onClick={() => setShareLogs({ date: today, logs: workLogs })}
                            style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                            📲 Share
                        </button>
                    )}
                </div>
                {loadingLogs ? (
                    <div style={styles.loadingText}>Loading...</div>
                ) : workLogs.length === 0 ? (
                    <div style={styles.emptyMessage}>No work log entries for today</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {workLogs.map((log) => (
                            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', backgroundColor: colors.bg, flexWrap: 'wrap' }}>
                                <span style={{ ...styles.badge, backgroundColor: '#e0e7ff', color: '#3730a3', fontWeight: 700, whiteSpace: 'nowrap' as const }}>
                                    {log.from_time} – {log.to_time}
                                </span>
                                <span style={{ flex: 1, fontSize: '13px', color: colors.text }}>{log.task_description}</span>
                                {isAutoWorkLog(log) ? (
                                    <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>⚡ Auto</span>
                                ) : (
                                    <button
                                        onClick={() => handleDeleteWorkLog(log.id)} title="Delete entry"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: colors.danger, padding: '2px 6px', borderRadius: '4px' }}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Search Past Logs */}
            <div style={styles.card}>
                <div style={{ ...styles.sectionTitle, fontSize: '15px', marginBottom: '14px' }}>🔍 Search Past Logs</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '12px' }}>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginBottom: '4px' }}>Date</label>
                        <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} style={{ ...styles.formInput, width: '100%' }} />
                    </div>
                    <button onClick={handleSearchLogs} disabled={searching} style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSm, opacity: searching ? 0.6 : 1 }}>
                        {searching ? 'Loading...' : '🔍 Search'}
                    </button>
                </div>
                {searchResults !== null && (
                    searchResults.length === 0 ? (
                        <div style={styles.emptyMessage}>No logs found for this date</div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: colors.primary, padding: '4px 10px', background: '#eff6ff', borderRadius: '6px' }}>
                                    {new Date(searchDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — {searchResults.length} entries
                                </div>
                                <button
                                    onClick={() => setShareLogs({ date: searchDate, logs: searchResults })}
                                    style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                >
                                    📲 Share
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {searchResults.map((l) => (
                                    <div key={l.id} style={{ display: 'flex', gap: '10px', padding: '8px 10px', background: colors.bg, borderRadius: '8px' }}>
                                        <div style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#4c1d95', background: '#ede9fe', padding: '3px 8px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
                                            {l.from_time}–{l.to_time}
                                        </div>
                                        <div style={{ fontSize: '13px', color: colors.text }}>{l.task_description}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )
                )}
            </div>

            {shareLogs && (
                <WorkLogShareModal date={shareLogs.date} logs={shareLogs.logs} name={engName} onClose={() => setShareLogs(null)} />
            )}
        </div>
    );
}