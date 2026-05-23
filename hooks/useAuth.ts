'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    signIn: (email: string, password: string) =>
      signIn('credentials', { email, password, redirect: false }),
    signOut: () => {
      signOut({ redirect: false }).then(() => {
        router.push('/login');
      });
    },
  };
}