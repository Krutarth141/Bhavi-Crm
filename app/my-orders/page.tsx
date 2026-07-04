import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function MyOrdersPage() {
    return (
        <LegacySurfaceScreen
            eyebrow="Customer Portal"
            title="My Orders"
            subtitle="The public shop flow now has a dedicated landing route for order tracking and post-checkout follow-up."
            points={[
                'Review cart submissions and completed orders.',
                'Track order status and fulfillment history.',
                'Use the same authenticated session as the rest of the app.',
            ]}
            primaryHref="/service-request"
            primaryLabel="Book Service"
            secondaryHref="/"
            secondaryLabel="Home"
        />
    );
}