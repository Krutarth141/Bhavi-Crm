import * as XLSX from 'xlsx';
import { WorkLog } from '@/types/workLogs';

// Matches HTML's fmtWLD(): reformats YYYY-MM-DD to DD-MM-YYYY.
function fmtWLD(d: string): string {
    if (!d || d.indexOf('-') === -1) return d;
    const [y, m, day] = d.split('-');
    return `${day}-${m}-${y}`;
}

// Sheet names are capped at 31 chars and can't contain: \ / ? * [ ]
function sanitizeSheetName(name: string): string {
    return (name || 'Unknown').replace(/[\\/?*\[\]]/g, '').slice(0, 31) || 'Unknown';
}

export function downloadWorkLogExcel(logs: WorkLog[]): void {
    if (!logs.length) {
        alert('Please search first');
        return;
    }

    const toRow = (l: WorkLog) => ({
        Role: l.member_role || 'Engineer',
        Name: l.eng_name || l.eng_id,
        Date: fmtWLD(l.log_date),
        From: l.from_time,
        To: l.to_time === 'OPEN' ? '' : l.to_time,
        Task: l.task_description,
    });

    const wb = XLSX.utils.book_new();

    const wsAll = XLSX.utils.json_to_sheet(logs.map(toRow));
    XLSX.utils.book_append_sheet(wb, wsAll, 'All Members');

    const byMember: Record<string, WorkLog[]> = {};
    logs.forEach((l) => {
        const key = l.eng_name || l.eng_id;
        if (!byMember[key]) byMember[key] = [];
        byMember[key].push(l);
    });
    Object.entries(byMember).forEach(([name, mLogs]) => {
        const ws = XLSX.utils.json_to_sheet(mLogs.map(toRow));
        XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(name));
    });

    const today = new Date().toLocaleDateString('en-CA');
    XLSX.writeFile(wb, `work_logs_${today}.xlsx`);
}