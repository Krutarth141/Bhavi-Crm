import LegacySurfaceScreen from '@/components/screens/LegacySurfaceScreen';

export default function WeeklyReportPage() {
    return <LegacySurfaceScreen eyebrow="Reports" title="Weekly Report" subtitle="The weekly summary route is preserved for management review." points={['Roll up the weekly activity and closure snapshot.', 'Mirror the reporting cadence used in the legacy app.', 'Surface this view alongside the other operational reports.']} />;
}