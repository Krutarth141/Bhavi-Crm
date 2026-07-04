import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function DeliveryPage() {
    return <LegacySurfaceScreen eyebrow="Public Flow" title="Product Delivery" subtitle="The delivery-collection branch from the reference walk-in flow is now present as a route." points={['Support outward collection and delivery confirmation.', 'Keep the public self-service path complete.', 'Return to the portal once the handoff is done.']} primaryHref="/walk-in" primaryLabel="Continue Walk-in" secondaryHref="/" secondaryLabel="Home" />;
}