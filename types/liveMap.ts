// Table: engineer_locations

export interface LiveLocation {
    id: string;
    eng_id?: string;
    eng_name?: string;
    lat?: number;
    lng?: number;
    address?: string;
    battery?: number;
    speed?: number;
    accuracy?: number;
    timestamp?: string;
    created_at?: string;
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