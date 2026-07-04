import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function ProductPage() {
    return <LegacySurfaceScreen eyebrow="Public Flow" title="Product Details" subtitle="The product details step remains available as a standalone route." points={['Collect model and serial information.', 'Keep problem capture linked to the ticket record.', 'Continue into the signature or submission step.']} primaryHref="/service-request" primaryLabel="Continue Request" secondaryHref="/" secondaryLabel="Home" />;
}