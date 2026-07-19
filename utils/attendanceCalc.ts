// Ported from computeAttExtras() and the Leaves calculation in
// loadAttendanceReport() (index.html:22496-22634).

import { PunchLog } from '@/types/attendance';
import { EmployeeShift } from '@/types/settings';

export const attToMin = (t?: string): number | null => {
    if (!t) return null;
    const parts = t.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
};

export const fmtAttMin = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

export interface AttExtras {
    officeMin: number;   // time inside shift window, after adjustment
    shortfall: number;   // late-in + early-out minutes
    adjustMin: number;   // shortfall covered by early-in / late-out surplus
}

export function computeAttExtras(l: PunchLog, shiftMap: Record<string, EmployeeShift>): AttExtras | null {
    const shift = l.eng_id ? shiftMap[l.eng_id] : undefined;
    if (!shift || !shift.shift_start || !shift.shift_end || !l.punch_in_time || !l.punch_out_time) return null;
    const shiftStart = attToMin(shift.shift_start), shiftEnd = attToMin(shift.shift_end);
    const actIn = attToMin(l.punch_in_time), actOut = attToMin(l.punch_out_time);
    if (shiftStart == null || shiftEnd == null || actIn == null || actOut == null || shiftEnd <= shiftStart) return null;
    const shiftMins = shiftEnd - shiftStart;
    const lateIn = Math.max(0, actIn - shiftStart);
    const earlyOut = Math.max(0, shiftEnd - actOut);
    const shortfall = lateIn + earlyOut;
    const surplus = Math.max(0, actOut - shiftEnd) + Math.max(0, shiftStart - actIn);
    const adjustMin = Math.min(shortfall, surplus);
    const officeMin = Math.max(0, Math.min(shiftMins, shiftMins - (shortfall - adjustMin)));
    return { officeMin, shortfall, adjustMin };
}

// Calendar days in [from, min(to, today)] that aren't the employee's weekly
// off and have no punch row. Only meaningful for one employee over a range.
export function computeLeaves(
    empId: string,
    from: string,
    to: string,
    logs: PunchLog[],
    shiftMap: Record<string, EmployeeShift>
): number {
    const today = new Date().toLocaleDateString('en-CA');
    const empShift = shiftMap[empId];
    const offDays = (empShift && empShift.weekly_off && empShift.weekly_off !== 'None')
        ? empShift.weekly_off.split(',')
        : ['Sunday'];
    const presentDates: Record<string, boolean> = {};
    logs.forEach(l => { if (l.eng_id === empId) presentDates[l.punch_in_date] = true; });
    const rangeEnd = to < today ? to : today;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const cursor = new Date(`${from}T00:00:00`);
    const endD = new Date(`${rangeEnd}T00:00:00`);
    let workingDays = 0, presentInRange = 0;
    while (cursor <= endD) {
        const iso = cursor.toLocaleDateString('en-CA');
        const wd = dayNames[cursor.getDay()];
        if (offDays.indexOf(wd) === -1) {
            workingDays++;
            if (presentDates[iso]) presentInRange++;
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return Math.max(0, workingDays - presentInRange);
}