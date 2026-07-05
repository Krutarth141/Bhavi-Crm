export interface AutoSiteVisitReport {
    id: number;
    site_id: number;
    site_name?: string;
    client_name?: string;
    visit_date?: string;
    visit_time?: string;
    work_done?: string;
    material_delivered?: string;
    created_by_name?: string;
    material_total?: number;
    created_at?: string;
}