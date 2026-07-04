import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function PartRequestPage() {
    return <LegacySurfaceScreen eyebrow="Workflow" title="Part Request" subtitle="Part request handling is now visible as a standalone route." points={['Request parts against service jobs.', 'Keep it tied to inventory and engineer flows.', 'Expose the same reference entry point.']} />;
}