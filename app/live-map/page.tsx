import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function LiveMapPage() {
    return (
        <LegacySurfaceScreen
            eyebrow="Operations"
            title="Live Map"
            subtitle="The reference dashboard exposed a live location surface for active work. This route preserves that entry point in the Next app."
            points={['Show active field work and current technician coverage.', 'Surface today’s route priorities and open visits.', 'Keep the route available under authenticated access.']}
        />
    );
}