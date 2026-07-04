import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function InquiryPage() {
    return <LegacySurfaceScreen eyebrow="Public Flow" title="Inquiry Form" subtitle="The inquiry variant of the service request stays available as its own route." points={['Capture requirements that are not standard repairs.', 'Keep the public intake flow tied to the CRM.', 'Return to the main request journey when complete.']} primaryHref="/service-request" primaryLabel="Continue Request" secondaryHref="/" secondaryLabel="Home" />;
}