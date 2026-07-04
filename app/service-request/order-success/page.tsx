import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function OrderSuccessPage() {
    return <LegacySurfaceScreen eyebrow="Public Flow" title="Order Success" subtitle="The checkout success screen is preserved for completed shop orders." points={['Confirm the order handoff after checkout.', 'Keep the public order journey closed-loop.', 'Point customers back to home or their orders.']} primaryHref="/my-orders" primaryLabel="My Orders" secondaryHref="/" secondaryLabel="Home" />;
}