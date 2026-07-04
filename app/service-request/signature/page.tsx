import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function SignaturePage() {
    return <LegacySurfaceScreen eyebrow="Public Flow" title="Signature" subtitle="The signature confirmation step is preserved as a route in the request journey." points={['Reserve the customer confirmation step.', 'Keep the request authenticated and traceable.', 'Proceed back to the service flow after signing.']} primaryHref="/service-request" primaryLabel="Continue Request" secondaryHref="/" secondaryLabel="Home" />;
}