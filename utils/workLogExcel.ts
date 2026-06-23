import { WorkLog } from '@/types/workLogs';

export function downloadWorkLogExcel(logs: WorkLog[]): void {
    if (!logs.length) {
        alert('No data to export.');
        return;
    }

    const headers = [
        'Date',
        'Engineer / WC',
        'Role',
        'From',
        'To',
        'Type',
        'Description',
    ];

    const rows = logs.map((l) => [
        l.log_date,
        l.eng_name || l.eng_id,
        l.member_role || 'Engineer',
        l.from_time,
        l.to_time === 'OPEN' ? 'Running' : l.to_time,
        l.log_type || 'work',
        `"${(l.task_description || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers, ...rows]
        .map((row) => row.join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}