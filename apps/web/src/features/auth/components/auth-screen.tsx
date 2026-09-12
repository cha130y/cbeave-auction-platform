'use client';

import { CBeaveLogo } from '@/components/brand/cbeave-logo';
import { readOauthErrorMessage } from '@/features/auth/auth-messages';
import { AuthLoadingScreen } from '@/features/auth/components/auth-loading-screen';
import { AuthenticationStatus } from '@/features/auth/components/auth-status';
import { LoginForm } from '@/features/auth/components/login-form';
import { RegisterForm } from '@/features/auth/components/register-form';
import { SocialButton } from '@/features/auth/components/social-button';
import { useAuth } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils/cn';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type AuthMode = 'login' | 'register';

const AUTH_MODES: AuthMode[] = ['login', 'register'];

const MODE_LABELS: Record<AuthMode, string> = {
  login: 'Log In',
  register: 'Register',
};

function AuthenticatedRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return <AuthLoadingScreen message='Opening the marketplace…' />;
}

export function AuthScreen({ oauthError }: { oauthError?: string }) {
  const { status } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const oauthErrorMessage = readOauthErrorMessage(oauthError);

  if (status === 'loading') {
    return <AuthLoadingScreen message='Restoring your secure session…' />;
  }

  if (status === 'authenticated') {
    return <AuthenticatedRedirect />;
  }

  return (
    <main className='relative isolate min-h-svh overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-12'>
      <div className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(0,229,255,0.15),transparent_34%),radial-gradient(circle_at_8%_82%,rgba(168,85,247,0.13),transparent_32%),linear-gradient(145deg,transparent_35%,rgba(255,255,255,0.018)_35.5%,transparent_36%)]' />
      <div className='pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-px max-w-5xl bg-linear-to-r from-transparent via-primary/70 to-transparent' />

      <div className='mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-lg flex-col items-center justify-center sm:min-h-[calc(100svh-6rem)]'>
        <CBeaveLogo className='mb-7' />

        <section className='w-full rounded-[1.7rem] border border-border bg-surface/92 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8'>
          <div className='grid grid-cols-2 rounded-xl bg-[#0b0b10] p-1'>
            {AUTH_MODES.map((tab) => {
              const isActive = tab === mode;

              return (
                <button
                  key={tab}
                  type='button'
                  onClick={() => {
                    setMode(tab);
                    setSuccessMessage(null);
                  }}
                  className={cn(
                    'h-10 rounded-lg text-sm font-bold capitalize transition',
                    isActive
                      ? 'bg-surface-muted text-white shadow-sm'
                      : 'text-white/35 hover:text-white/65',
                  )}
                  aria-pressed={isActive}
                >
                  {MODE_LABELS[tab]}
                </button>
              );
            })}
          </div>

          <header className='mb-6 mt-7'>
            <h1 className='text-2xl font-extrabold tracking-tight sm:text-[1.7rem]'>
              {mode === 'login' ? 'Welcome back 👋' : 'Join the action ⚡'}
            </h1>
            <p className='mt-2 text-sm leading-6 text-muted'>
              {mode === 'login'
                ? 'Sign in to watch, sell, and bid live.'
                : 'Create your bidder profile and enter the arena.'}
            </p>
          </header>

          {mode === 'login' ? (
            <div className='space-y-4'>
              <AuthenticationStatus message={oauthErrorMessage} />
              <AuthenticationStatus message={successMessage} tone='success' />
              <LoginForm />
            </div>
          ) : (
            <RegisterForm
              onRegistered={(email, message) => {
                setMode('login');
                setSuccessMessage(`${message}. Sign in as ${email}.`);
              }}
            />
          )}

          <div className='my-6 flex items-center gap-3 text-[10px] font-bold tracking-[0.14em] text-white/28'>
            <span className='h-px flex-1 bg-border' />
            OR CONTINUE WITH
            <span className='h-px flex-1 bg-border' />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <SocialButton label='Google' mark='G' provider='google' />
            <SocialButton label='Facebook' mark='f' provider='facebook' />
          </div>

          <p className='mt-6 text-center text-xs text-white/42'>
            {mode === 'login'
              ? 'Don’t have an account? '
              : 'Already have an account? '}
            <button
              type='button'
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className='font-bold text-primary transition hover:text-[#7af3ff]'
            >
              {mode === 'login' ? 'Register' : 'Log in'}
            </button>
          </p>
        </section>

        <p className='mt-6 max-w-sm text-center text-[11px] leading-5 text-white/28'>
          By using CBeave you agree to our Terms of Service &amp; Privacy Policy
        </p>
      </div>
    </main>
  );
}
