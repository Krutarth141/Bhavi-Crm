import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function AutoSitesPage() {
    return <LegacySurfaceScreen eyebrow="Automation" title="Auto Sites" subtitle="Automated site tracking remains available as a separate admin screen." points={['Review site-based automation outputs.', 'Keep the authenticated dashboard route intact.', 'Mirror the legacy navigation item.']} />;
}