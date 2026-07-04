import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function ProfitPage() {
    return <LegacySurfaceScreen eyebrow="Reports" title="Profit" subtitle="Profit analysis remains available as a dedicated reporting surface." points={['Summarize revenue and cost views from the reporting stack.', 'Use the same authenticated session as other admin reports.', 'Keep the route present even if the detailed calculations live elsewhere.']} />;
}