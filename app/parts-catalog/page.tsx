import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function PartsCatalogPage() {
    return <LegacySurfaceScreen eyebrow="Inventory" title="Parts Catalog" subtitle="Parts catalog access is provided as a standalone route in addition to the existing inventory and engineer-parts screens." points={['Browse part references and stock-facing identifiers.', 'Keep it close to the inventory/master-data data layer.', 'Use the authenticated CRM session.']} />;
}