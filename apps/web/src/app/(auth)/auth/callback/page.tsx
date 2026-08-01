'use client';

import { CBeaveLogo } from '@/components/brand/cbeave-logo';
import { useAuth } from '@/features/auth/use-auth';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SocialAuthenticationCallbackPage() {
  const { restoreSession } = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let isActive = true;

    void restoreSession()
      .then(() => {
        if (isActive) {
          window.location.replace('/');
        }
      })
      .catch(() => {
        if (isActive) {
          setFailed(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [restoreSession]);

  return (
    <main className='relative grid min-h-svh place-items-center overflow-hidden bg-background px-5'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,229,255,0.13),transparent_36%)]' />
      <section className='relative w-full max-w-sm rounded-3xl border border-border bg-surface/90 p-8 text-center shadow-2xl shadow-black/35'>
        <CBeaveLogo className='justify-center' />
        {failed ? (
          <>
            <h1 className='mt-8 text-2xl font-extrabold'>
              Sign-in could not be completed
            </h1>
            <p className='mt-3 text-sm leading-6 text-muted'>
              The social session was not available. Return to authentication and
              try again.
            </p>
            <Link
              href='/auth'
              className='mt-6 flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-[#041216]'
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <div className='mx-auto mt-8 size-7 animate-spin rounded-full border-2 border-white/10 border-t-primary' />
            <h1 className='mt-5 text-xl font-extrabold'>
              Completing secure sign-in
            </h1>
            <p className='mt-2 text-sm text-muted'>
              CBeave is restoring your account session…
            </p>
          </>
        )}
      </section>
    </main>
  );
}
