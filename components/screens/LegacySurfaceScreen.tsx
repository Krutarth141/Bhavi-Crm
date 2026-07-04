import Link from 'next/link';

type LegacySurfaceScreenProps = {
    eyebrow: string;
    title: string;
    subtitle: string;
    points: string[];
    primaryHref?: string;
    primaryLabel?: string;
    secondaryHref?: string;
    secondaryLabel?: string;
};

export default function LegacySurfaceScreen({
    eyebrow,
    title,
    subtitle,
    points,
    primaryHref = '/dashboard',
    primaryLabel = 'Back to Dashboard',
    secondaryHref = '/',
    secondaryLabel = 'Home',
}: LegacySurfaceScreenProps) {
    return (
        <div style={styles.page}>
            <div style={styles.panel}>
                <div style={styles.eyebrow}>{eyebrow}</div>
                <h1 style={styles.title}>{title}</h1>
                <p style={styles.subtitle}>{subtitle}</p>

                <div style={styles.grid}>
                    {points.map((point) => (
                        <div key={point} style={styles.card}>
                            {point}
                        </div>
                    ))}
                </div>

                <div style={styles.actions}>
                    <Link href={secondaryHref} style={styles.secondaryButton}>{secondaryLabel}</Link>
                    <Link href={primaryHref} style={styles.primaryButton}>{primaryLabel}</Link>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', padding: 16, background: 'linear-gradient(180deg, #0f172a 0%, #f4f7fc 20%, #f8fbff 100%)' },
    panel: { maxWidth: 960, margin: '0 auto', background: '#fff', borderRadius: 28, padding: 24, boxShadow: '0 24px 80px rgba(15, 23, 42, 0.16)' },
    eyebrow: { textTransform: 'uppercase', letterSpacing: '0.16em', color: '#1d4ed8', fontSize: 12, fontWeight: 900 },
    title: { margin: '8px 0 0', fontSize: 34, color: '#0f172a', lineHeight: 1.05 },
    subtitle: { margin: '10px 0 0', color: '#475569', maxWidth: 760, lineHeight: 1.6 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 18 },
    card: { border: '1px solid #dbe4f0', background: '#f8fbff', borderRadius: 18, padding: 16, color: '#0f172a', fontWeight: 700, lineHeight: 1.5 },
    actions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18, flexWrap: 'wrap' },
    primaryButton: { border: 'none', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 900, textDecoration: 'none' },
    secondaryButton: { border: '1px solid #dbe4f0', background: '#fff', color: '#0f172a', padding: '12px 18px', borderRadius: 14, fontWeight: 900, textDecoration: 'none' },
};