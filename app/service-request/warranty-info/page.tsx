import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function WarrantyInfoPage() {
    return <LegacySurfaceScreen eyebrow="Public Flow" title="Warranty Info" subtitle="The warranty support handoff remains available as a standalone page." points={['Show the Canon support instructions from the legacy flow.', 'Keep the support contact details in a dedicated screen.', 'Route back to the service journey after viewing.']} primaryHref="/service-request" primaryLabel="Continue Request" secondaryHref="/" secondaryLabel="Home" />;
}