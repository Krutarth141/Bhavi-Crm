export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
    id: number;
    eng_id: string;
    eng_name?: string;
    role?: string;
    from_date: string;
    to_date: string;
    reason: string;
    status: LeaveStatus;
    review_note?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    applied_at?: string;
}