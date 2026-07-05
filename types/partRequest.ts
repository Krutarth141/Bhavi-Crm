// Exact schema: eng_part_requests
// id (uuid), created_at, type, status, engineer_id, engineer_name,
// parts (jsonb array), notes, approved_by, approved_at

export interface PartItem {
    part_id?: string;
    part_name?: string;
    qty?: number;
    price?: number;
}

export interface PartRequest {
    id: string;
    type?: string;          // e.g. 'request', 'issue', 'return'
    status: 'pending' | 'approved' | 'rejected';
    engineer_id?: string;
    engineer_name: string;
    parts?: PartItem[];     // jsonb array
    notes?: string;
    approved_by?: string;
    approved_at?: string;
    created_at?: string;
}

export type PartRequestFilter = 'pending' | 'approved' | 'rejected' | 'all';