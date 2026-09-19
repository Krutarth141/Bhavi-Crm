// Mirrors HTML's holiday-aware TAT calc (index.html:5978-6081) — Sunday plus
// 3 fixed-date national holidays are recognized automatically; admin-added
// movable holidays (Diwali, Eid, etc.) come from the `holidays` table.

// Fixed-date Indian national holidays that fall on the same MM-DD every
// year (Republic Day, Independence Day, Gandhi Jayanti) — recognized with
// zero admin setup.
export const FIXED_NATIONAL_HOLIDAYS = ['01-26', '08-15', '10-02'];

export function isHolidayDate(d: Date, extraHolidays: Set<string>): boolean {
    if (d.getDay() === 0) return true; // Sunday
    const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (FIXED_NATIONAL_HOLIDAYS.includes(mmdd)) return true;
    const ymd = d.toLocaleDateString('en-CA');
    return extraHolidays.has(ymd);
}

// index.html:6062-6079 — a two-step push: first shift the RECEIVE time
// itself past any holiday(s) it was logged during, then add +24h and keep
// pushing another +24h for every further consecutive holiday day the
// deadline still lands on.
export function computeHolidayAwareTat(receivedAt: Date, extraHolidays: Set<string>): Date {
    let start = new Date(receivedAt.getTime());
    let shiftedDays = 0;
    while (isHolidayDate(start, extraHolidays) && shiftedDays < 14) {
        start = new Date(start.getTime() + 24 * 3600000);
        shiftedDays++;
    }
    let d = new Date(start.getTime() + 24 * 3600000);
    let pushedDays = 0;
    while (isHolidayDate(d, extraHolidays) && pushedDays < 14) {
        d = new Date(d.getTime() + 24 * 3600000);
        pushedDays++;
    }
    return d;
}