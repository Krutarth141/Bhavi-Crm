import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function TermsPage() {
    return <LegacySurfaceScreen eyebrow="Public Flow" title="Terms & Conditions" subtitle="The service request flow preserves the legacy terms page as a standalone route." points={['Show the acceptance copy before submission.', 'Keep the public flow consistent with the CRM request path.', 'Return to the booking journey once accepted.']} primaryHref="/service-request" primaryLabel="Continue Request" secondaryHref="/" secondaryLabel="Home" />;
}