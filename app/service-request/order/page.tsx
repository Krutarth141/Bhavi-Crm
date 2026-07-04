import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function OrderPage() {
    return <LegacySurfaceScreen eyebrow="Public Flow" title="Complete Order" subtitle="The legacy shop checkout route is now represented as a standalone page." points={['Keep cart-to-order handoff available for customers.', 'Use the same public session path as the home screen.', 'Continue to the order success handoff after checkout.']} primaryHref="/" primaryLabel="Return Home" secondaryHref="/my-orders" secondaryLabel="My Orders" />;
}