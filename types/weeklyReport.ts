import { DailyReport, WCDailyReport } from '@/types/reports';

export type { DailyReport, WCDailyReport };

export interface WeeklyFilter {
    from: string;
    to: string;
}

export const getWeekRange = (): WeeklyFilter => {
    const today = new Date();
    const day = today.getDay() || 7; // Mon=1..Sun=7
    const mon = new Date(today);
    mon.setDate(today.getDate() - (day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
        from: mon.toLocaleDateString('en-CA'),
        to: sun.toLocaleDateString('en-CA'),
    };
};

export const getLastWeekRange = (): WeeklyFilter => {
    const { from } = getWeekRange();
    const thisMonday = new Date(from + 'T00:00:00');
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    return {
        from: lastMonday.toLocaleDateString('en-CA'),
        to: lastSunday.toLocaleDateString('en-CA'),
    };
};