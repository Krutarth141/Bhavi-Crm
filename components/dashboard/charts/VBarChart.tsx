'use client';

interface Entry { label: string; value: number; color: string; }

export default function VBarChart({ entries, height = 110 }: { entries: Entry[]; height?: number }) {
    const max = Math.max(...entries.map(e => e.value), 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height }}>
            {entries.map((e, i) => {
                const pct = Math.max(e.value > 0 ? 6 : 0, Math.round((e.value / max) * 100));
                return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{e.value || ''}</div>
                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                            <div style={{ width: '100%', height: `${pct}%`, background: e.color, borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }} title={e.label}>{e.label}</div>
                    </div>
                );
            })}
        </div>
    );
}