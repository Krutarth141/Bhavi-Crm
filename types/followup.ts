export interface FollowupTicket {
    id: string;
    cname?: string;
    mobile?: string;
    model?: string;
    problem?: string;
    assigned_name?: string;
    follow_up_date?: string;
    follow_up_note?: string;
    status?: string;
}

export type FollowupFilterType = 'overdue' | 'today' | 'upcoming' | 'all';