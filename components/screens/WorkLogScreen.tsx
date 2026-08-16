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

// ─── Engineer's own Work Log — mirrors HTML's renderWorkLog() ──────────────
// A separate nav page from My Calls (HTML: nav-work-log vs nav-my-calls),
// so an engineer can log a day's activity independent of any specific call.

function generateTimeSlots(): string[] {
    const slots: string[] = [];
    for (let h = 7; h <= 21; h++) {
        for (const m of ['00', '30']) {
            slots.push(`${String(h).padStart(2, '0')}:${m}`);
        }
    }
    return slots;
}
const TIME_SLOTS = generateTimeSlots();

function getLogTypeBadgeStyle(logType: string): React.CSSProperties {
    const t = (logType ?? 'work').toLowerCase();
    if (t === 'travel') return { ...styles.badge, backgroundColor: '#e0f2fe', color: '#0369a1' };
    if (t === 'meeting') return { ...styles.badge, backgroundColor: '#f3e8ff', color: '#7c3aed' };
    if (t === 'training') return { ...styles.badge, backgroundColor: '#fef3c7', color: '#d97706' };
    return { ...styles.badge, backgroundColor: '#d1fae5', color: '#065f46' };
}

interface EngineerWorkLogScreenProps {
    engId: string;
    engName: string;
}

export function EngineerWorkLogScreen({ engId, engName }: EngineerWorkLogScreenProps) {
    const today = new Date().toLocaleDateString('en-CA');
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    const loadToday = async () => {
        setLoadingLogs(true);
        const r = await fetchWorkLogsByDate(engId, today);
        setWorkLogs(r.data || []);
        setLoadingLogs(false);
    };
    useEffect(() => { if (engId) loadToday(); }, [engId]);

    // Entry form state
    const [wlFrom, setWlFrom] = useState('');
    const [wlTo, setWlTo] = useState('');
    const [wlTask, setWlTask] = useState('');
    const [wlLogType, setWlLogType] = useState('work');
    const [wlSubmitted, setWlSubmitted] = useState(false);
    const [wlSaving, setWlSaving] = useState(false);
    const [shareLogs, setShareLogs] = useState<{ date: string; logs: WorkLog[] } | null>(null);
    const [searchDate, setSearchDate] = useState(today);
    const [searchResults, setSearchResults] = useState<WorkLog[] | null>(null);
    const [searching, setSearching] = useState(false);

    const handleSaveWorkLog = async () => {
        setWlSubmitted(true);
        if (!wlFrom || !wlTo || !wlTask.trim()) return;
        setWlSaving(true);
        const result = await saveWorkLog({
            eng_id: engId,
            eng_name: engName,
            member_role: 'Engineer',
            log_date: today,
            from_time: wlFrom,
            to_time: wlTo,
            task_description: wlTask.trim(),
            log_type: wlLogType,
        });
        setWlSaving(false);
        if (result.success) {
            setWlFrom(''); setWlTo(''); setWlTask(''); setWlLogType('work'); setWlSubmitted(false);
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

    const handleWhatsAppShare = () => {
        const todayLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        const logLines = workLogs.map((l) => `• ${l.from_time}–${l.to_time}: ${l.task_description}`).join('\n');
        const text = `📋 Work Log — ${todayLabel}\n${engName}\n\n${logLines}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div style={{ padding: '20px', backgroundColor: colors.bg, minHeight: '100vh' }}>
            <div style={{ ...styles.sectionHeader, marginBottom: '20px' }}>
                <h2 style={{ ...styles.sectionTitle, fontSize: '22px' }}>🗒️ Work Log</h2>
                <button
                    onClick={handleWhatsAppShare}
                    style={{ ...styles.btn, backgroundColor: '#25d366', color: '#fff', padding: '8px 16px' }}
                >
                    📤 WhatsApp Share
                </button>
            </div>

            {/* Add Work Log Entry */}
            <div style={{ ...styles.card, marginBottom: '20px' }}>
                <div style={{ ...styles.sectionTitle, fontSize: '15px', marginBottom: '14px' }}>➕ Add Work Log Entry</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>From Time</label>
                        <select value={wlFrom} onChange={(e) => setWlFrom(e.target.value)} style={{ ...styles.formInput, borderColor: wlSubmitted && !wlFrom ? colors.danger : colors.border }}>
                            <option value="">-- Select --</option>
                            {TIME_SLOTS.map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>To Time</label>
                        <select value={wlTo} onChange={(e) => setWlTo(e.target.value)} style={{ ...styles.formInput, borderColor: wlSubmitted && !wlTo ? colors.danger : colors.border }}>
                            <option value="">-- Select --</option>
                            {TIME_SLOTS.map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Log Type</label>
                        <select value={wlLogType} onChange={(e) => setWlLogType(e.target.value)} style={styles.formInput}>
                            <option value="work">Work</option>
                            <option value="travel">Travel</option>
                            <option value="meeting">Meeting</option>
                            <option value="training">Training</option>
                        </select>
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
                                <span style={getLogTypeBadgeStyle(log.log_type ?? 'work')}>{log.log_type ?? 'work'}</span>
                                <span style={{ flex: 1, fontSize: '13px', color: colors.text }}>{log.task_description}</span>
                                <button
                                    onClick={() => handleDeleteWorkLog(log.id)} title="Delete entry"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: colors.danger, padding: '2px 6px', borderRadius: '4px' }}
                                >
                                    🗑️
                                </button>
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