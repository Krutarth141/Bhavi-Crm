import { WorkLog } from '@/types/myCalls';

export const formatWorkLogWA = (date: string, logs: WorkLog[], name: string): string => {
    const DIV = '━━━━━━━━━━━━━━━━━━━━━';
    const lines: string[] = [];
    const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    let totalMins = 0;
    lines.push(DIV);
    lines.push('🕐 *WORK LOG*');
    lines.push(DIV);
    lines.push(`👷 *${name || ''}*`);
    lines.push(`📅 ${dateStr}`);
    lines.push('');
    lines.push('▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔');
    logs.forEach((l, i) => {
        const isOpen = l.to_time === 'OPEN';
        const timeLabel = `${l.from_time} → ${isOpen ? 'Running ⏳' : l.to_time}`;
        if (!isOpen && l.from_time && l.to_time) {
            const f = l.from_time.split(':');
            const t = l.to_time.split(':');
            const diff = (parseInt(t[0]) * 60 + parseInt(t[1])) - (parseInt(f[0]) * 60 + parseInt(f[1]));
            if (diff > 0) totalMins += diff;
        }
        lines.push(`  ${i + 1}. *${timeLabel}*`);
        lines.push(`      ${l.task_description}`);
        if (i < logs.length - 1) lines.push('');
    });
    lines.push('▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔');
    lines.push('');
    if (totalMins > 0) {
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        lines.push(`⏱ *Total Time: ${h ? h + ' hr ' : ''}${m} min*`);
        lines.push('');
    }
    lines.push(DIV);
    lines.push('_Bhavi Electronics — CRM_');
    return lines.join('\n');
};