import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import Providers from '@/components/Providers';
import PwaRegister from '@/components/PwaRegister';
import '@/styles/global.css';
import '@/styles/auth.css';
import '@/styles/screens.css';

export const metadata: Metadata = {
  title: 'BHAVI CRM - Service Management',
  description: 'Electronics & Automation Service CRM',
  manifest: '/manifest.json',
  themeColor: '#1e2a3a',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <Providers session={session}>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}