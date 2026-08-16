export interface WorkLog {
    id: number;
    log_date: string;
    from_time: string;
    to_time: string;
    task_description: string;
    log_type: string;
    eng_id: string;
    eng_name: string;
    member_role?: string;
    ticket_id?: string | null;
    // Server-enriched from `tickets` for the matching ticket_id.
    area?: string;
    service_type?: string;
    // Server-enriched GPS — closing location (engineer_locations,
    // event_type='ticket_close') and arrival location (km_logs,
    // entry_type='arrival') for the matching ticket_id.
    close_lat?: number;
    close_lng?: number;
    close_accuracy?: number;
    arrival_lat?: number;
    arrival_lng?: number;
    arrival_accuracy?: number;
}

// Exact Supabase schema: peon_task_logs
// id, peon_id, peon_name, log_date, task_name, task_label, done_at,
// extra_from, extra_to
export interface PeonTaskLog {
    id: number;
    peon_id: string;
    peon_name: string;
    log_date: string;
    task_name: string;
    task_label?: string;
    done_at?: string;
    extra_from?: string;
    extra_to?: string;
}

export type PeonLogsByPeon = Record<string, Record<string, PeonTaskLog[]>>;

export interface WorkLogMember {
    id: string;
    name: string;
    role: 'Engineer' | 'WC' | 'Peon';
}

export interface WorkLogFilters {
    from: string;
    to: string;
    engId: string;
}

export interface WorkLogStats {
    totalEntries: number;
    totalEngineers: number;
    totalDays: number;
}

// Grouped structure: { engName -> { date -> WorkLog[] } }
export type WorkLogsByEngineer = Record<string, Record<string, WorkLog[]>>;