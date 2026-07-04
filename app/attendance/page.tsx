import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function AttendancePage() {
    return <LegacySurfaceScreen eyebrow="Operations" title="Attendance" subtitle="Attendance and shift coverage remain accessible from their own route." points={['View punch visibility by user and day.', 'Keep shift history aligned with the dashboard settings.', 'Use the same auth/session layer as the CRM.']} />;
}