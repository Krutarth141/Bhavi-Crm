import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function InquiriesPage() {
    return <LegacySurfaceScreen eyebrow="Operations" title="Inquiries" subtitle="Inquiry handling is retained as a separate administrative view." points={['Review submitted service and product questions.', 'Tie inquiries back to the public request flow.', 'Keep the CRM’s auth and session rules.']} />;
}