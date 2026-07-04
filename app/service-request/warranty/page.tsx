import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function WarrantyPage() {
    return <LegacySurfaceScreen eyebrow="Public Flow" title="Warranty Status" subtitle="The public request flow still exposes the warranty decision screen from the reference app." points={['Capture warranty state before product details.', 'Keep the CRM request pipeline aligned with legacy behavior.', 'Continue into product entry after selection.']} primaryHref="/service-request" primaryLabel="Continue Request" secondaryHref="/" secondaryLabel="Home" />;
}