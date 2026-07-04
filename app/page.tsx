import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import PublicHomeScreen from '@/components/screens/PublicHomeScreen';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return <PublicHomeScreen />;
}