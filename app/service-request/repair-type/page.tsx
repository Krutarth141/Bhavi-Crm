import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function RepairTypePage() {
    return <LegacySurfaceScreen eyebrow="Public Flow" title="Repair Type" subtitle="The legacy service flow begins with choosing onsite or carry-in service." points={['Onsite and carry-in options remain distinct entry points.', 'Keep the service flow aligned with the CRM ticket pipeline.', 'Route back into the public request journey.']} primaryHref="/service-request" primaryLabel="Continue Request" secondaryHref="/" secondaryLabel="Home" />;
}