import { supabase } from '@/lib/supabase';
import { KmLog, KmDayGroup, KmReportEntry } from '@/types/kmTracking';

const KM_BUCKET = 'product-images';

export const uploadKmPhoto = async (dataUrl: string, engId: string): Promise<string> => {
    const blob = await (await fetch(dataUrl)).blob();
    const fname = `km_${String(engId).replace(/[^A-Za-z0-9_-]/g, '')}_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from(KM_BUCKET).upload(fname, blob, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw error;
    const { data } = supabase.storage.from(KM_BUCKET).getPublicUrl(fname);
    return data.publicUrl;
};

export const fetchTodayKmLogs = async (engId: string): Promise<KmLog[]> => {
    try {
        const today = new Date().toLocaleDateString('en-CA');
        const { data, error } = await supabase.from('km_logs').select('*')
            .eq('eng_id', engId).eq('log_date', today).order('captured_at', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchTodayKmLogs:', err); return []; }
};

export const hasKmEntryToday = async (engId: string, type: 'opening' | 'arrival' | 'closing'): Promise<boolean> => {
    const logs = await fetchTodayKmLogs(engId);
    return logs.some((l) => l.entry_type === type);
};

export const fetchTodayMaxReading = async (engId: string): Promise<number | null> => {
    const logs = await fetchTodayKmLogs(engId);
    let max: number | null = null;
    logs.forEach((l) => { const n = parseFloat(String(l.odometer_km)); if (!isNaN(n) && (max === null || n > max)) max = n; });
    return max;
};

export const saveKmLog = async (params: {
    engId: string; engName: string; type: 'opening' | 'arrival' | 'closing';
    ticketId?: string | null; odometerKm: number; photoDataUrl: string;
    lat: number | null; lng: number | null; gpsAccuracy: number | null;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        let photoUrl: string;
        try { photoUrl = await uploadKmPhoto(params.photoDataUrl, params.engId); }
        catch { photoUrl = params.photoDataUrl; }
        const now = new Date();
        const { error } = await supabase.from('km_logs').insert([{
            eng_id: params.engId,
            eng_name: params.engName,
            log_date: now.toLocaleDateString('en-CA'),
            entry_type: params.type,
            ticket_id: params.ticketId || null,
            odometer_km: params.odometerKm,
            photo_url: photoUrl,
            lat: params.lat, lng: params.lng, gps_accuracy: params.gpsAccuracy,
            captured_at: now.toISOString(), created_at: now.toISOString(),
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const fetchOfficeLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
        const { data, error } = await supabase.from('company_info').select('office_lat, office_lng').eq('id', 1).maybeSingle();
        if (error) throw error;
        if (data?.office_lat != null && data?.office_lng != null) return { lat: Number(data.office_lat), lng: Number(data.office_lng) };
        return null;
    } catch { return null; }
};

export const setOfficeLocation = async (lat: number, lng: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('company_info').upsert([{ id: 1, office_lat: lat, office_lng: lng, updated_at: new Date().toISOString() }]);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const editKmReading = async (id: number, newKm: number, remark: string, byUser: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('km_logs').update({ odometer_km: newKm, edit_remark: remark, corrected_by: byUser, edited_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

const haversineKm = (la1: number, ln1: number, la2: number, ln2: number) => {
    const R = 6371;
    const dLat = (la2 - la1) * Math.PI / 180;
    const dLng = (ln2 - ln1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export interface KmReportResult {
    groups: KmDayGroup[];
    grandKm: number;
    dayCount: number;
    entryCount: number;
}

export const fetchKmReport = async (from: string, to: string, engId?: string): Promise<KmReportResult> => {
    const officeLoc = await fetchOfficeLocation();
    let query = supabase.from('km_logs').select('*').gte('log_date', from).lte('log_date', to)
        .order('eng_id', { ascending: true }).order('captured_at', { ascending: true });
    if (engId) query = query.eq('eng_id', engId);
    const { data: logs, error } = await query;
    if (error) throw error;
    if (!logs || !logs.length) return { groups: [], grandKm: 0, dayCount: 0, entryCount: 0 };

    const ticketIds = Array.from(new Set(logs.map((l: any) => l.ticket_id).filter((x: any) => x && !String(x).startsWith('FT') && !String(x).startsWith('SV'))));
    const areaMap: Record<string, string> = {};
    if (ticketIds.length) {
        const { data: tk } = await supabase.from('tickets').select('id, area, city').in('id', ticketIds);
        (tk || []).forEach((t: any) => { areaMap[t.id] = t.area || t.city || ''; });
    }

    const groupsMap: Record<string, { eng_id: string; eng_name: string; date: string; entries: KmReportEntry[] }> = {};
    (logs as any[]).forEach((l) => {
        const k = `${l.eng_id}|${l.log_date}`;
        if (!groupsMap[k]) groupsMap[k] = { eng_id: l.eng_id, eng_name: l.eng_name || l.eng_id, date: l.log_date, entries: [] };
        groupsMap[k].entries.push({ ...l, area: l.ticket_id ? areaMap[l.ticket_id] || '' : '' });
    });

    let grandKm = 0;
    const groups: KmDayGroup[] = Object.keys(groupsMap).sort().map((k) => {
        const g = groupsMap[k];
        let opening: number | null = null, closing: number | null = null, prev: number | null = null, maxRead: number | null = null;
        let openingLoc: { lat: number; lng: number } | null = null, closingLoc: { lat: number; lng: number } | null = null;
        g.entries.forEach((l) => {
            const kmN = parseFloat(String(l.odometer_km));
            if (l.entry_type === 'opening' && opening === null && !isNaN(kmN)) opening = kmN;
            if (l.entry_type === 'opening' && !openingLoc && l.lat && l.lng) openingLoc = { lat: Number(l.lat), lng: Number(l.lng) };
            if (l.entry_type === 'closing' && l.lat && l.lng) closingLoc = { lat: Number(l.lat), lng: Number(l.lng) };
            if (l.entry_type === 'closing' && !isNaN(kmN)) closing = kmN;
            if (!isNaN(kmN) && (maxRead === null || kmN > maxRead)) maxRead = kmN;
            l.segmentKm = (prev !== null && !isNaN(kmN) && kmN >= prev) ? kmN - prev : null;
            if (!isNaN(kmN)) prev = kmN;
        });
        const totalKm = (opening !== null && maxRead !== null && maxRead >= opening) ? maxRead - opening : 0;
        grandKm += totalKm;
        const labelFor = (loc: { lat: number; lng: number } | null) => {
            if (!loc) return { label: '—', mapsUrl: '' };
            const mapsUrl = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
            if (officeLoc) {
                const dist = Math.round(haversineKm(loc.lat, loc.lng, officeLoc.lat, officeLoc.lng) * 10) / 10;
                return { label: dist <= 0.3 ? '🏢 Office' : `📍 Away (~${dist} km)`, mapsUrl };
            }
            return { label: '📍 View Location', mapsUrl };
        };
        const start = labelFor(openingLoc);
        const end = labelFor(closingLoc);
        return {
            eng_id: g.eng_id, eng_name: g.eng_name, date: g.date,
            dateLabel: new Date(g.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' }),
            entries: g.entries, opening, closing, totalKm,
            startLabel: start.label, startMapsUrl: start.mapsUrl,
            endLabel: end.label, endMapsUrl: end.mapsUrl,
        };
    });

    return { groups, grandKm, dayCount: groups.length, entryCount: logs.length };
};