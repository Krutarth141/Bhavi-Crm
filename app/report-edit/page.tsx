import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function ReportEditPage() {
    return <LegacySurfaceScreen eyebrow="Workflow" title="Report Edit" subtitle="The report edit workflow is now available as a dedicated route." points={['Edit report details before submission or approval.', 'Keep the workflow within the authenticated CRM session.', 'Use this as the route counterpart to the legacy modal.']} />;
}