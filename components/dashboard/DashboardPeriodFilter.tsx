'use client';

export type DashPeriod = 'all' | 'today' | 'week' | 'month' | 'lastmonth' | 'custom';

const LABELS: Record<'all' | 'today' | 'week' | 'month' | 'lastmonth', string> = {
    all: 'All Time', today: 'Today', week: 'This Week', month: 'This Month', lastmonth: 'Last Month',
};

interface Props {
    period: DashPeriod;
    fromDate: string;
    toDate: string;
    resultCount: number;
    periodLabel: string;
    onPeriodChange: (p: DashPeriod) => void;
    onFromChange: (v: string) => void;
    onToChange: (v: string) => void;
    onApplyCustom: () => void;
}

export default function DashboardPeriodFilter({ period, fromDate, toDate, resultCount, periodLabel, onPeriodChange, onFromChange, onToChange, onApplyCustom }: Props) {
    const btnStyle = (active: boolean) => ({
        padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
        border: `1.5px solid ${active ? '#2563eb' : '#e5e7eb'}`,
        background: active ? '#2563eb' : 'transparent',
        color: active ? '#fff' : '#6b7280', cursor: 'pointer',
    } as const);

    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginRight: 4 }}>Period:</span>
            {(['all', 'today', 'week', 'month', 'lastmonth'] as const).map(p => (
                <button key={p} onClick={() => onPeriodChange(p)} style={btnStyle(period === p)}>{LABELS[p]}</button>
            ))}
            <button onClick={() => onPeriodChange('custom')} style={btnStyle(period === 'custom')}>Custom</button>
            {period === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                    <input type="date" value={fromDate} onChange={e => onFromChange(e.target.value)} style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6 }} />
                    <span style={{ fontSize: 12, color: '#6b7280' }}>to</span>
                    <input type="date" value={toDate} onChange={e => onToChange(e.target.value)} style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6 }} />
                    <button onClick={onApplyCustom} style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Apply</button>
                </div>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280', fontWeight: 600, background: '#f1f5f9', padding: '3px 10px', borderRadius: 99 }}>
                Showing: {periodLabel} — {resultCount} tickets
            </span>
        </div>
    );
}