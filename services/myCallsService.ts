import { supabase } from '@/lib/supabase';
import { WorkLog } from '@/types/myCalls';
import { notifyPunchIn } from './telegramNotify';

// Punch in for the day. Blocks only when an active punch already exists FOR TODAY.
// A still-'active' row from a PREVIOUS day means the engineer forgot to punch out;
// HTML (index.html:4055-4086) auto-closes those into status 'late_pending' — the same
// admin approval queue a late/next-day punch-out lands in — and lets today's punch-in
// proceed in one tap, instead of blocking the morning behind a punch-out for yesterday.
export const punchIn = async (params: {
    eng_id: string;
    eng_name: string;
    punch_in_date: string;
    punch_in_time: string;
    start_meter?: number;
    photo?: string | null;
    lat?: number | null;
    lng?: number | null;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { eng_id, eng_name, punch_in_date, punch_in_time, start_meter, photo, lat, lng } = params;
        const today = new Date().toLocaleDateString('en-CA');

        const { data: existing, error: fetchError } = await supabase
            .from('punch_logs')
            .select('id, punch_in_time')
            .eq('eng_id', eng_id)
            .eq('status', 'active')
            .eq('punch_in_date', today)
            .limit(1)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (existing) {
            return {
                success: false,
                error: `Already Punched In!\nTime: ${existing.punch_in_time || ''}\nAlready punched in from another device.`,
            };
        }

        // Auto-close forgotten punches from previous days (HTML index.html:4066-4086).
        try {
            const { data: stale } = await supabase
                .from('punch_logs')
                .select('id')
                .eq('eng_id', eng_id)
                .eq('status', 'active')
                .neq('punch_in_date', today)
                .order('created_at', { ascending: false })
                .limit(5);
            for (const s of (stale || [])) {
                await supabase.from('punch_logs').update({
                    status: 'late_pending',
                    is_late: true,
                    is_next_day: true,
                    late_remark: 'Auto-closed — engineer punched in fresh the next day without punching out (Admin: please verify/correct the actual punch-out time).',
                    updated_at: new Date().toISOString(),
                }).eq('id', s.id);
            }
        } catch (e) { console.log('stale punch auto-close error:', e); }

        const { error } = await supabase
            .from('punch_logs')
            .insert([{
                eng_id, eng_name, punch_in_date, punch_in_time, start_meter,
                status: 'active',
                punch_in_photo: photo || null,
                punch_in_lat: lat ?? null,
                punch_in_lng: lng ?? null,
            }]);

        if (error) throw error;
        notifyPunchIn(eng_name, punch_in_time);
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Punch out. Detects late (after 10PM / before 6AM) or next-day punch-outs and
// requires a mandatory reason for those, mirroring the HTML app's compliance
// flow — such punches land in status 'late_pending' for admin approval
// (already fully implemented on the admin side in PunchLogsTab.tsx).
export const punchOut = async (params: {
    eng_id: string;
    punch_out_time: string;
    end_meter?: number;
    photo?: string | null;
    lat?: number | null;
    lng?: number | null;
    lateRemark?: string;
}): Promise<{ success: boolean; error?: string; needsRemark?: boolean }> => {
    try {
        const { eng_id, punch_out_time, end_meter, photo, lat, lng, lateRemark } = params;

        const { data: active, error: fetchError } = await supabase
            .from('punch_logs')
            .select('*')
            .eq('eng_id', eng_id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!active) return { success: false, error: 'No active punch-in found. Please Punch In first.' };

        const now = new Date();
        const today = now.toLocaleDateString('en-CA');
        const isNextDay = !!active.punch_in_date && active.punch_in_date !== today;
        const hour = now.getHours();
        const isLatePunchOut = hour >= 22 || hour < 6 || isNextDay;

        if (isLatePunchOut && !lateRemark?.trim()) {
            return {
                success: false,
                needsRemark: true,
                error: isNextDay
                    ? 'Next-day punch out — a reason is required (admin approval needed).'
                    : 'Late punch out (after 10 PM) — a reason is required (admin approval needed).',
            };
        }

        let workMins = 0;
        let otMins = 0;
        try {
            const { data: ss } = await supabase.from('shift_settings').select('*').eq('emp_id', eng_id).limit(1).maybeSingle();
            if (active.punch_in_time && punch_out_time) {
                const toMins = (t: string) => {
                    const isPM = /pm/i.test(t);
                    const isAM = /am/i.test(t);
                    const clean = t.replace(/[^0-9:]/g, '');
                    const [h0, m0] = clean.split(':').map((x) => parseInt(x, 10) || 0);
                    let h = h0;
                    if (isPM && h !== 12) h += 12;
                    if (isAM && h === 12) h = 0;
                    return h * 60 + m0;
                };
                const inM = toMins(active.punch_in_time);
                const outM = toMins(punch_out_time);
                workMins = outM - inM;
                if (workMins < 0) workMins += 1440;
                const shiftMins = ss ? toMins(ss.shift_end) - toMins(ss.shift_start) : 480;
                otMins = Math.max(0, workMins - shiftMins);
            }
        } catch { /* best-effort — working hours are informational, not blocking */ }

        const { error } = await supabase
            .from('punch_logs')
            .update({
                punch_out_time,
                punch_out_date: today,
                end_meter,
                status: isLatePunchOut ? 'late_pending' : 'verified',
                is_late: isLatePunchOut,
                late_remark: lateRemark || '',
                is_next_day: isNextDay,
                punch_out_photo: photo || null,
                punch_out_lat: lat ?? null,
                punch_out_lng: lng ?? null,
                working_minutes: workMins,
                overtime_minutes: otMins,
                updated_at: new Date().toISOString(),
            })
            .eq('id', active.id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Save a work log entry.
export const saveWorkLog = async (
    entry: Omit<WorkLog, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
        const { data, error } = await supabase
            .from('work_logs')
            .insert([entry])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Delete a work log by id.
export const deleteWorkLog = async (
    id: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('work_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const fetchWorkLogsByDate = async (
    engId: string, date: string
): Promise<{ success: boolean; data?: WorkLog[]; error?: string }> => {
    try {
        const { data, error } = await supabase
            .from('work_logs')
            .select('*')
            .eq('eng_id', engId)
            .eq('log_date', date)
            .order('from_time');
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Return to Office / Return to Home — mirrors HTML's startReturnToOffice()/
// reachedOffice()/startReturnToHome()/reachedHome(): an "OPEN" travel work_log
// entry brackets the return trip; any other open log for the day is closed
// out first, matching HTML's "close any other open travel/work log first".
export const startReturnTrip = async (
    engId: string, engName: string, memberRole: string, kind: 'office' | 'home'
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const nowTime = now.toTimeString().slice(0, 5);
        const nowDate = now.toLocaleDateString('en-CA');
        const { data: openLogs } = await supabase.from('work_logs').select('id')
            .eq('eng_id', engId).eq('log_date', nowDate).eq('to_time', 'OPEN');
        for (const ol of (openLogs || [])) {
            await supabase.from('work_logs').update({ to_time: nowTime }).eq('id', ol.id);
        }
        const { error } = await supabase.from('work_logs').insert([{
            eng_id: engId, eng_name: engName, member_role: memberRole,
            log_date: nowDate, from_time: nowTime, to_time: 'OPEN',
            task_description: kind === 'office' ? '🏠 Return to Office' : '🏡 Return to Home',
            log_type: 'travel', created_at: now.toISOString(),
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

export const finishReturnTrip = async (
    logId: string, engId: string, engName: string, memberRole: string, kind: 'office' | 'home'
): Promise<{ success: boolean; error?: string }> => {
    try {
        const now = new Date();
        const nowTime = now.toTimeString().slice(0, 5);
        const nowDate = now.toLocaleDateString('en-CA');
        const { error } = await supabase.from('work_logs').update({ to_time: nowTime }).eq('id', logId);
        if (error) throw error;
        await supabase.from('work_logs').insert([{
            eng_id: engId, eng_name: engName, member_role: memberRole,
            log_date: nowDate, from_time: nowTime, to_time: nowTime,
            task_description: kind === 'office' ? '🏢 Reached Office' : '🏡 Reached Home',
            log_type: 'work', created_at: now.toISOString(),
        }]).then(() => undefined);
        return { success: true };
    } catch (err) { return { success: false, error: String(err) }; }
};

// True when the day's most recent KM entry isn't already a 'closing' one —
// mirrors HTML's kmTodayLogs() check before Reached Office/Home so the
// closing odometer photo is captured once per open travel leg.
export const needsClosingKm = async (engId: string): Promise<boolean> => {
    try {
        const today = new Date().toLocaleDateString('en-CA');
        const { data } = await supabase.from('km_logs').select('entry_type')
            .eq('eng_id', engId).eq('log_date', today).order('captured_at', { ascending: true });
        if (!data || !data.length) return false;
        return data[data.length - 1].entry_type !== 'closing';
    } catch { return false; }
};

export interface PrevLocation { ticketId: string; lat: number; lng: number; at: string; }

// Mirrors HTML's mcBuildPrevLocMap(): bulk lookup of the most recent GPS point
// (arrival KM or call-close location) recorded for OTHER tickets sharing the
// same serial number, so the engineer can quickly re-navigate to a familiar
// install without re-asking the customer for directions. No new table — just
// a bulk read across km_logs/engineer_locations, keyed via serial.
export const fetchPrevLocationMap = async (tickets: { id: string; serial?: string }[]): Promise<Record<string, PrevLocation>> => {
    try {
        const serials = Array.from(new Set(tickets.map((t) => t.serial).filter((s): s is string => !!s && !s.startsWith('NO-SN-'))));
        if (!serials.length) return {};
        const { data: sameSerial } = await supabase.from('tickets').select('id, serial').in('serial', serials);
        const byId: Record<string, string> = {};
        (sameSerial || []).forEach((t: any) => { byId[t.id] = t.serial; });
        const allIds = Object.keys(byId);
        if (!allIds.length) return {};
        const [{ data: arrivals }, { data: closes }] = await Promise.all([
            supabase.from('km_logs').select('ticket_id, lat, lng, captured_at').in('ticket_id', allIds).eq('entry_type', 'arrival').not('lat', 'is', null),
            supabase.from('engineer_locations').select('ticket_id, lat, lng, recorded_at').in('ticket_id', allIds).eq('event_type', 'ticket_close').not('lat', 'is', null),
        ]);
        const points = [
            ...(arrivals || []).map((l: any) => ({ ticketId: l.ticket_id, lat: l.lat, lng: l.lng, at: l.captured_at })),
            ...(closes || []).map((l: any) => ({ ticketId: l.ticket_id, lat: l.lat, lng: l.lng, at: l.recorded_at })),
        ];
        const bestBySerial: Record<string, PrevLocation> = {};
        points.forEach((p) => {
            const serial = byId[p.ticketId];
            if (!serial) return;
            const cur = bestBySerial[serial];
            if (!cur || new Date(p.at) > new Date(cur.at)) bestBySerial[serial] = { ticketId: p.ticketId, lat: p.lat, lng: p.lng, at: p.at };
        });
        return bestBySerial;
    } catch (err) {
        console.error('fetchPrevLocationMap:', err);
        return {};
    }
};
// ─── GPS location tracking (SIMPLIFIED port of index.html:14988-15165) ───────
// The HTML original is an always-on tracking subsystem with a visibilitychange
// handler, a pageshow/bfcache re-arm, a self-healing GPS watchdog and a
// periodic work-log reminder timer. This port deliberately implements only the
// core: a watchPosition fix plus a 2-minute 'track' ping while punched in, and
// the one-off 'punch_out'/'ticket_close' events that fetchPrevLocationMap and
// the Live Map already read. The re-arm/watchdog/reminder pieces are NOT ported.

// Office logins that punch in but never need continuous live GPS
// (index.html:4044 LIVE_TRACKING_EXCLUDED_IDS).
const LIVE_TRACKING_EXCLUDED_IDS = ['WC001', 'WC002', 'ACCT001'];

const TRACK_INTERVAL_MS = 2 * 60 * 1000; // index.html:15040 — every 2 minutes

interface GeoFix { lat: number; lng: number; accuracy: number }

let _watchId: number | null = null;
let _locInterval: ReturnType<typeof setInterval> | null = null;
let _lastKnownLoc: GeoFix | null = null;
let _trackEngId = '';
let _trackEngName = '';

const getLocation = (): Promise<GeoFix | null> => new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
});

// Writes one engineer_locations row. Column shape matches what
// fetchPrevLocationMap (above) and the Live Map already read.
export const saveLocationEvent = async (
    eventType: 'track' | 'punch_in' | 'punch_out' | 'ticket_close',
    ticketId?: string | null,
    locOverride?: GeoFix | null,
    engId?: string,
    engName?: string
): Promise<GeoFix | null> => {
    const loc = locOverride || await getLocation();
    if (!loc) return null;
    try {
        await supabase.from('engineer_locations').insert([{
            eng_id: engId || _trackEngId,
            eng_name: engName || _trackEngName,
            lat: loc.lat,
            lng: loc.lng,
            accuracy: loc.accuracy,
            event_type: eventType,
            ticket_id: ticketId || null,
            session_date: new Date().toLocaleDateString('en-CA'),
            recorded_at: new Date().toISOString(),
        }]);
    } catch (e) { console.log('Location save error:', e); }
    return loc;
};

// Starts (or no-ops on) continuous tracking for this engineer. Call on a
// successful punch-in.
export const startLocationTracking = (engId: string, engName?: string, ticketId?: string): void => {
    if (_watchId !== null || _locInterval !== null) return;
    if (LIVE_TRACKING_EXCLUDED_IDS.includes(engId)) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    _trackEngId = engId;
    _trackEngName = engName || '';
    _lastKnownLoc = null;

    // watchPosition is OS-level GPS and fires on every position change, which
    // survives backgrounding better than polling getCurrentPosition.
    _watchId = navigator.geolocation.watchPosition(
        (p) => { _lastKnownLoc = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }; },
        (e) => console.log('GPS watch error:', e.code, e.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    // Immediate fix on start, then a steady ping off the last known position
    // (fast, no extra GPS call).
    saveLocationEvent('track', ticketId ?? null, null, engId, engName);
    _locInterval = setInterval(() => {
        saveLocationEvent('track', ticketId ?? null, _lastKnownLoc, engId, engName);
    }, TRACK_INTERVAL_MS);
};

// Clears the watch + interval. Call on punch-out.
export const stopLocationTracking = (): void => {
    if (_watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(_watchId);
    }
    _watchId = null;
    if (_locInterval) clearInterval(_locInterval);
    _locInterval = null;
    _lastKnownLoc = null;
};