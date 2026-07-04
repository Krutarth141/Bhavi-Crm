import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function TargetsPage() {
    return <LegacySurfaceScreen eyebrow="Management" title="Targets" subtitle="Target tracking is kept as a dedicated management surface for the admin team." points={['Monitor performance goals and closure progress.', 'Align targets with the existing reports data.', 'Expose the same role-based access as the dashboard.']} />;
}