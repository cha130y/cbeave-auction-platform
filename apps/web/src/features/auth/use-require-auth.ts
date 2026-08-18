'use client';

import { useAuth } from '@/features/auth/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useRequireAuth() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      router.replace('/auth');
    }
  }, [router, auth.status]);

  return auth;
}
