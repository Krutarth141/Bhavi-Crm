'use client';

import { BarChartItem } from '@/types/reports';

interface ReportsBarChartProps {
    data: BarChartItem[];
}

export default function ReportsBarChart({ data }: ReportsBarChartProps) {
    const visible = data.filter((d) => d.value > 0);
    const max = Math.max(...data.map((d) => d.value), 1);

    if (!visible.length) {
        return <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No data for selected period</p>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.map((d) => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '160px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.label}
                    </div>
                    <div style={{ flex: 1, background: 'var(--bg)', borderRadius: '4px', height: '22px', overflow: 'hidden' }}>
                        <div
                            style={{
                                width: `${(d.value / max) * 100}%`,
                                background: d.color || 'var(--primary)',
                                height: '100%',
                                borderRadius: '4px',
                                transition: 'width 0.4s ease',
                                minWidth: d.value > 0 ? '4px' : '0',
                            }}
                        />
                    </div>
                    <div style={{ width: '40px', fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                        {d.value}
                    </div>
                </div>
            ))}
        </div>
    );
}