'use client';

import { useAuth } from '@/features/auth/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useRequireAdmin() {
  const router = useRouter();
  const auth = useAuth();
  const isAdmin =
    auth.status === 'authenticated' && auth.user?.role === 'ADMIN';

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      router.replace('/auth');
      return;
    }

    if (auth.status === 'authenticated' && auth.user?.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [router, auth.status, auth.user?.role]);

  return { ...auth, isAdmin };
}
