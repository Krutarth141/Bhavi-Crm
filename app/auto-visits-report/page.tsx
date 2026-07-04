import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function AutoVisitsReportPage() {
    return <LegacySurfaceScreen eyebrow="Automation" title="Visit Report" subtitle="Automated visit reporting is retained as a dedicated management route." points={['Review visit summaries and automation results.', 'Keep the route under the same dashboard access control.', 'Mirror the legacy report entry point.']} />;
}