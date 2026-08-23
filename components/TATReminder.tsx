'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { tatDeadline } from '@/utils/tatHelpers';

interface TatTicket { id: string; cname?: string; model?: string; status?: string; tat_date: string; assigned_to?: string; }

export default function TATReminder() {
    const { data: session } = useSession();
    const [overdue, setOverdue] = useState<TatTicket[]>([]);
    const [urgent, setUrgent] = useState<TatTicket[]>([]);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const user = session?.user as any;
        if (!user) return;
        const role = user.roleType;
        const isAdminOrWC = role === 'admin' || role === 'work_controller';
        const isEng = role === 'engineer';
        if (!isAdminOrWC && !isEng) return;

        const t = setTimeout(async () => {
            try {
                let query = supabase
                    .from('tickets')
                    .select('id,cname,model,status,tat_date,assigned_to')
                    .not('tat_date', 'is', null)
                    // Exclude EVERY done status (incl. Resolved By Phone, Repaired,
                    // Pending for Delivery) plus cancelled — a closed call must never
                    // appear in TAT reminders (index.html:5831).
                    .not('status', 'in', '("Closed","Delivered","Repaired","Pending for Delivery","Resolved By Phone","Call Cancel","Customer Reject")')
                    .order('tat_date', { ascending: true })
                    // HTML queries every matching row (sbAll). A hard cap of 20 could
                    // crowd urgent items out behind a wall of old overdue ones; the
                    // urgent/overdue split plus the 2-day window below does the real
                    // narrowing, so this is only a sanity ceiling.
                    .limit(100);
                // HTML (index.html:5829) filters assigned_to by currentUser.eng_id||user_id —
                // the login code, which here is session.user.email. user.id is the DB PK and
                // never matches tickets.assigned_to, so this always returned zero rows.
                if (isEng) query = query.eq('assigned_to', user.email);
                const { data } = await query;
                if (!data || !data.length) return;

                const now = new Date();
                const soon = new Date(now.getTime() + 4 * 3600000);
                // Overdue by more than 2 days is a lost cause for THIS reminder (the
                // TAT is long gone, there is nothing to catch up on) — those still
                // show in the full Pending List, just not here. Within the 2-day
                // window, reversing the tat_date-ascending rows puts barely-overdue
                // (still catchable) first (index.html:5842).
                const TWO_DAYS = 2 * 24 * 3600000;
                const ov = data
                    .filter((t: any) => {
                        const dl = tatDeadline(t.tat_date);
                        return dl < now && (now.getTime() - dl.getTime()) <= TWO_DAYS;
                    })
                    .reverse();
                const ur = data.filter((t: any) => { const dl = tatDeadline(t.tat_date); return dl >= now && dl <= soon; });
                if (!ov.length && !ur.length) return;
                setOverdue(ov);
                setUrgent(ur);
            } catch { /* best-effort */ }
        }, 800);

        return () => clearTimeout(t);
    }, [session]);

    if (dismissed || (!overdue.length && !urgent.length)) return null;

    const goToPending = () => {
        setDismissed(true);
        try { window.dispatchEvent(new CustomEvent('bhavi:navigate-tab', { detail: { tab: 'pending' } })); } catch { /* noop */ }
    };

    const row = (t: TatTicket, kind: 'overdue' | 'urgent') => {
        const dl = tatDeadline(t.tat_date);
        const isDayOnly = /T00:00:00/.test(t.tat_date);
        const now = new Date();
        if (kind === 'overdue') {
            const overdueHrs = Math.round((now.getTime() - dl.getTime()) / 3600000);
            const label = overdueHrs < 1 ? 'Just now' : overdueHrs < 24 ? `${overdueHrs}h overdue` : `${Math.floor(overdueHrs / 24)}d overdue`;
            const deadlineStr = isDayOnly ? 'End of Day' : dl.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
            return (
                <div key={t.id} onClick={(e) => { e.stopPropagation(); goToPending(); }} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 5 }}>
                    <div>
                        <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>{t.id}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{t.cname || ''}{t.model ? ` · ${t.model}` : ''}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>Deadline: {deadlineStr}</div>
                    </div>
                    <span style={{ background: '#dc2626', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
                </div>
            );
        }
        const minsLeft = Math.round((dl.getTime() - now.getTime()) / 60000);
        const label = minsLeft < 60 ? `${minsLeft}m left` : `${Math.floor(minsLeft / 60)}h ${minsLeft % 60 ? `${minsLeft % 60}m ` : ''}left`;
        const deadlineStr = isDayOnly ? 'End of Day' : dl.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        return (
            <div key={t.id} onClick={(e) => { e.stopPropagation(); goToPending(); }} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, marginBottom: 5 }}>
                <div>
                    <div style={{ fontWeight: 700, color: '#d97706', fontSize: 13 }}>{t.id}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{t.cname || ''}{t.model ? ` · ${t.model}` : ''}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>Deadline: {deadlineStr}</div>
                </div>
                <span style={{ background: '#d97706', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>⏰ {label}</span>
            </div>
        );
    };

    return (
        <div onClick={() => setDismissed(true)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, maxWidth: 420, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div style={{ background: '#fff7ed', borderBottom: '2px solid #fed7aa', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
                    <h2 style={{ color: '#c2410c', margin: 0, fontSize: 17 }}>🚨 TAT Reminder</h2>
                    <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: 16 }}>
                    {/* Due-soon (not yet breached) goes first — those are still fully
                      avoidable if acted on now, which makes them the highest-value
                      thing to see at the top of the popup. Already-overdue calls
                      follow below since the deadline's already gone (index.html:5847,
                      "Due-soon...goes first" / "Already-overdue calls follow below"). */}
                    {urgent.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>⏰ DUE WITHIN 4 HOURS ({urgent.length})</div>
                            {urgent.map((t) => row(t, 'urgent'))}
                        </div>
                    )}
                    {overdue.length > 0 && (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>⚠️ OVERDUE ({overdue.length})</div>
                            {overdue.map((t) => row(t, 'overdue'))}
                        </div>
                    )}
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>Click any call to open it</div>
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
                    <button onClick={goToPending} style={{ flex: 1, padding: '8px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📋 View Pending List</button>
                    <button onClick={() => setDismissed(true)} style={{ flex: 1, padding: '8px 14px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Dismiss</button>
                </div>
            </div>
        </div>
    );
}