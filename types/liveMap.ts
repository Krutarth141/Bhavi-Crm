// Exact schema: engineer_locations
// id, eng_id, eng_name, lat, lng, accuracy,
// event_type, ticket_id, session_date, recorded_at

export interface LiveLocation {
    id: string;
    eng_id?: string;
    eng_name?: string;
    lat?: number;
    lng?: number;
    accuracy?: number;
    event_type?: string;    // e.g. 'punch_in', 'punch_out', 'visit'
    ticket_id?: string;
    session_date?: string;
    recorded_at?: string;   // was 'timestamp' — actual column name
}

export const timeAgo = (ts?: string): string => {
    if (!ts) return 'Unknown';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

export const isOnline = (ts?: string): boolean => {
    if (!ts) return false;
    return Date.now() - new Date(ts).getTime() < 30 * 60 * 1000;
};