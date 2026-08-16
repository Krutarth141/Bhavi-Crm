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
}

export interface WorkLogMember {
    id: string;
    name: string;
    role: 'Engineer' | 'WC';
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