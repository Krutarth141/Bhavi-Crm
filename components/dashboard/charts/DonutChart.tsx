'use client';

interface Segment { label: string; value: number; color: string; }

export default function DonutChart({ segments, size = 80 }: { segments: Segment[]; size?: number }) {
    const total = segments.reduce((a, s) => a + s.value, 0) || 1;
    let cum = 0;
    const stops = segments.map(s => {
        const pct = (s.value / total) * 100;
        const stop = `${s.color} ${cum.toFixed(1)}% ${(cum + pct).toFixed(1)}%`;
        cum += pct;
        return stop;
    });
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: size, height: size, borderRadius: '50%', background: `conic-gradient(${stops.join(',')})`, flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, textAlign: 'left' }}>
                {segments.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <span style={{ color: '#6b7280' }}>{s.label}</span>
                        <b style={{ marginLeft: 'auto', paddingLeft: 6 }}>{s.value}</b>
                    </div>
                ))}
            </div>
        </div>
    );
}