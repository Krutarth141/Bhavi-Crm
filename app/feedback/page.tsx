import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function FeedbackPage() {
    return <LegacySurfaceScreen eyebrow="Management" title="Feedback" subtitle="Customer feedback is exposed as its own screen for review and follow-up." points={['Capture comments from service and delivery interactions.', 'Review trends alongside the reports module.', 'Keep the route available to managers and admins.']} />;
}