import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function CustomerApprovalPage() {
    return <LegacySurfaceScreen eyebrow="Workflow" title="Customer Approval" subtitle="The customer approval workflow is now surfaced as a route." points={['Review estimates and approval outcomes.', 'Tie the surface to ticket workflows.', 'Preserve the original CRM access point.']} />;
}