import { supabase } from '@/lib/supabase';
import { AutoSiteVisitReport } from '@/types/autoVisitsReport';

// Mirrors HTML's loadAutoVisitReport() (index.html:21618-21641): date range +
// optional site filter, and an ad-hoc (site_id null) visit falls back to its
// own adhoc_* columns for Site / Client instead of rendering blank.
export const fetchAutoVisitsReport = async (
    from?: string, to?: string, siteId?: number | null
): Promise<AutoSiteVisitReport[]> => {
    try {
        // index.html:1222 — sb() sends Range: 0-9999, i.e. no meaningful cap
        // for a report like this. Page through instead of a fixed .limit()
        // so a busy date range doesn't silently drop rows past the cutoff.
        let all: any[] = [];
        let from0 = 0;
        const PAGE = 1000;
        while (true) {
            let query = supabase
                .from('auto_site_visits')
                .select('*, auto_sites(site_name, client_name)')
                .order('visit_date', { ascending: false })
                .order('created_at', { ascending: false })
                .range(from0, from0 + PAGE - 1);
            if (from) query = query.gte('visit_date', from);
            if (to) query = query.lte('visit_date', to);
            if (siteId) query = query.eq('site_id', siteId);
            const { data, error } = await query;
            if (error) throw error;
            all = all.concat(data || []);
            if (!data || data.length < PAGE) break;
            from0 += PAGE;
        }
        return all.map((v: any) => {
            const isAdhoc = !v.site_id;
            const adhocPlace = [v.adhoc_address, v.adhoc_area].filter(Boolean).join(', ');
            return {
                ...v,
                site_name: isAdhoc
                    ? `🔧 ${v.adhoc_label || 'One-off Visit'}${adhocPlace ? ` — ${adhocPlace}` : ''}`
                    : (v.auto_sites?.site_name || '-'),
                client_name: isAdhoc ? (v.adhoc_client_name || '—') : (v.auto_sites?.client_name || '-'),
            };
        });
    } catch (err) { console.error('fetchAutoVisitsReport:', err); return []; }
};

// photos is jsonb, but older rows stored it as a JSON string (index.html:21665).
export const visitPhotos = (photos: string[] | string | null | undefined): string[] => {
    if (!photos) return [];
    if (typeof photos === 'string') {
        try { const p = JSON.parse(photos); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return Array.isArray(photos) ? photos : [];
};