import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function AccountPage() {
    return (
        <LegacySurfaceScreen
            eyebrow="Customer Portal"
            title="My Account"
            subtitle="The legacy self-service account area is now available as a standalone route for profile and booking access."
            points={[
                'View your saved profile details and contact information.',
                'Track open requests and submitted check-ins from one place.',
                'Keep the same sign-in flow used across the CRM.',
            ]}
            primaryHref="/dashboard"
            primaryLabel="Open CRM"
            secondaryHref="/"
            secondaryLabel="Home"
        />
    );
}