export interface DailyReport {
    id: string;
    eng_name: string;
    report_date: string;
    calls_done?: number;
    calls_closed?: number;
    google_reviews?: number;
    remarks?: string;
    created_at?: string;
}

export interface WCDailyReport {
    id: string;
    wc_name: string;
    report_date: string;
    calls_registered?: number;
    calls_allocated?: number;
    pending_calls?: number;
    walkin_count?: number;
    remarks?: string;
    created_at?: string;
}

export interface WeeklyFilter {
    from: string;
    to: string;
}

export const getWeekRange = () => {
    const today = new Date();
    const mon = new Date(today);
    mon.setDate(today.getDate() - today.getDay() + 1);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
        from: mon.toLocaleDateString('en-CA'),
        to: sun.toLocaleDateString('en-CA'),
    };
};