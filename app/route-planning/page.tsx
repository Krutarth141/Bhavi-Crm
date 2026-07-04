import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function RoutePlanningPage() {
    return <LegacySurfaceScreen eyebrow="Operations" title="Route Planning" subtitle="Field route planning stays available as its own authenticated screen." points={['Map the day’s work order sequence.', 'Keep it aligned with tickets, walk-ins, and courier work.', 'Expose the original utility entry point.']} />;
}