// Table: eng_part_requests
// id, eng_name, part_id, part_name (joined), qty, action, status,
// ticket_id, note, created_at

export interface PartRequest {
    id: string;
    eng_name: string;
    part_id?: string;
    part_name?: string;
    qty?: number;
    action?: string;
    status: 'pending' | 'approved' | 'rejected';
    ticket_id?: string;
    note?: string;
    created_at?: string;
    updated_at?: string;
}

export type PartRequestFilter = 'pending' | 'approved' | 'rejected' | 'all';