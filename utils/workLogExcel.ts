import * as XLSX from 'xlsx';
import { WorkLog } from '@/types/workLogs';

// Matches HTML's fmtWLD(): reformats YYYY-MM-DD to DD-MM-YYYY.
function fmtWLD(d: string): string {
    if (!d || d.indexOf('-') === -1) return d;
    const [y, m, day] = d.split('-');
    return `${day}-${m}-${y}`;
}

// Sheet names are capped at 31 chars and can't contain: : \ / ? * [ ]
function sanitizeSheetName(name: string): string {
    return (name || 'Unknown').replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Unknown';
}

// Combined "All Members" sheet — 6 columns (index.html:21914-21921).
const toRowAll = (l: WorkLog) => ({
    Role: l.member_role || 'Engineer',
    Name: l.eng_name || l.eng_id,
    Date: fmtWLD(l.log_date),
    From: l.from_time,
    To: l.to_time === 'OPEN' ? '' : l.to_time,
    Task: l.task_description,
});

// Per-member sheets — 4 columns only, Role/Name omitted since the sheet
// itself is already scoped to one member (index.html:21935-21940).
const toRowMember = (l: WorkLog) => ({
    Date: fmtWLD(l.log_date),
    From: l.from_time,
    To: l.to_time === 'OPEN' ? '' : l.to_time,
    Task: l.task_description,
});

export function downloadWorkLogExcel(logs: WorkLog[]): void {
    if (!logs.length) {
        alert('Please search first');
        return;
    }

    const wb = XLSX.utils.book_new();

    const wsAll = XLSX.utils.json_to_sheet(logs.map(toRowAll));
    wsAll['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsAll, 'All Members');

    const byMember: Record<string, WorkLog[]> = {};
    logs.forEach((l) => {
        const key = l.eng_name || l.eng_id;
        if (!byMember[key]) byMember[key] = [];
        byMember[key].push(l);
    });
    Object.entries(byMember).forEach(([name, mLogs]) => {
        const ws = XLSX.utils.json_to_sheet(mLogs.map(toRowMember));
        ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 60 }];
        XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(name));
    });

    const today = new Date().toLocaleDateString('en-CA');
    XLSX.writeFile(wb, `work_logs_${today}.xlsx`);
}