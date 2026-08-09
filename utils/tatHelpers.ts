export interface TatLabelResult {
    text: string;
    overdue: boolean;
}

// t.tat_date can be an "end of day" sentinel (T00:00:00) or a specific timed deadline.
export const tatDeadline = (tatDate: string): Date => {
    const d = new Date(tatDate);
    const isDayOnly = /T00:00:00/.test(tatDate);
    return isDayOnly ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59) : d;
};

export const tatLabel = (tatDate?: string): TatLabelResult => {
    if (!tatDate) return { text: 'No TAT set', overdue: false };
    const isDayOnly = /T00:00:00/.test(tatDate);
    const dl = tatDeadline(tatDate);
    const timeStr = isDayOnly ? 'End of Day' : dl.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = dl.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const overdue = dl.getTime() - Date.now() < 0;
    return { text: `${dateStr} · ${timeStr}${overdue ? ' ⚠️ Overdue' : ''}`, overdue };
};