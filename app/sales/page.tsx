import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function SalesPage() {
    return <LegacySurfaceScreen eyebrow="Management" title="Sales" subtitle="Sales tracking is available as a dedicated route for the admin team." points={['Review sales-related service and product totals.', 'Keep it linked to the same authenticated dashboard.', 'Match the legacy navigation entry point.']} />;
}