export interface AutoSiteVisitReport {
    id: number;
    /** null for an ad-hoc (one-off) visit — the adhoc_* fields describe it instead. */
    site_id: number | null;
    site_name?: string;
    client_name?: string;
    visit_date?: string;
    visit_time?: string;
    work_done?: string;
    material_delivered?: string;
    created_by_name?: string;
    created_by?: string;
    material_total?: number;
    created_at?: string;
    /** Visit photo URLs (index.html:21668-21673) — jsonb, sometimes a JSON string. */
    photos?: string[] | string | null;
    // Ad-hoc (one-off, no site_id) visit fields — index.html:21633-21641.
    adhoc_label?: string | null;
    adhoc_address?: string | null;
    adhoc_area?: string | null;
    adhoc_client_name?: string | null;
}