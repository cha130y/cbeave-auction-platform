'use client';

import { CBeaveLogo } from '@/components/brand/cbeave-logo';
import {
  getSocialLoginUrl,
  register as registerRequest,
} from '@/features/auth/api/auth.api';
import {
  loginCredentialsSchema,
  registerCredentialsSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from '@/features/auth/schemas/auth.schemas';
import { useAuth } from '@/features/auth/use-auth';
import { ApiError } from '@/lib/api/api-error';
import { cn } from '@/lib/utils/cn';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form';

type AuthMode = 'login' | 'register';

const fieldClassName =
  'h-12 w-full rounded-xl border border-border bg-[#0d0d12]/85 px-4 text-[15px] text-white outline-none transition placeholder:text-white/25 focus:border-primary/70 focus:ring-3 focus:ring-primary/10';

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className='mt-1.5 text-xs font-medium text-danger' role='alert'>
      {message}
    </p>
  );
}

function PasswordField({
  autoComplete,
  error,
  label,
  registration,
}: {
  autoComplete: string;
  error?: string;
  label: string;
  registration: UseFormRegisterReturn;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className='block'>
      <span className='mb-2 block text-[11px] font-bold tracking-[0.14em] text-white/48'>
        {label}
      </span>
      <span className='relative block'>
        <input
          {...registration}
          className={cn(fieldClassName, 'pr-16')}
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
        />
        <button
          type='button'
          onClick={() => setIsVisible((value) => !value)}
          className='absolute inset-y-0 right-1 flex items-center rounded-lg px-3 text-xs font-semibold text-white/45 transition hover:text-primary focus-visible:outline-2 focus-visible:outline-primary'
          aria-label={`${isVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </span>
      <FieldError message={error} />
    </label>
  );
}

function SocialButton({
  label,
  mark,
  provider,
}: {
  label: string;
  mark: string;
  provider: 'google' | 'facebook';
}) {
  return (
    <button
      type='button'
      onClick={() => window.location.assign(getSocialLoginUrl(provider))}
      className='flex h-11 items-center justify-center gap-2.5 rounded-xl border border-border-strong bg-white/[0.025] text-sm font-semibold text-white/82 transition hover:border-white/25 hover:bg-white/[0.055] focus-visible:outline-2 focus-visible:outline-primary'
    >
      <span
        className={cn(
          'grid size-5 place-items-center rounded-full bg-white text-xs font-black',
          provider === 'google' ? 'text-[#4285f4]' : 'bg-[#1877f2] text-white',
        )}
        aria-hidden='true'
      >
        {mark}
      </span>
      {label}
    </button>
  );
}

function AuthenticationStatus({
  message,
  tone = 'error',
}: {
  message: string | null;
  tone?: 'error' | 'success';
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-xl border px-3.5 py-3 text-sm',
        tone === 'success'
          ? 'border-success/25 bg-success/8 text-[#8df0d5]'
          : 'border-danger/25 bg-danger/8 text-[#ff8fa5]',
      )}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {message}
    </div>
  );
}

function readErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

function LoginForm() {
  const { login } = useAuth();
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    register,
    handleSubmit,
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    resolver: zodResolver(loginCredentialsSchema),
  });

  const submit = handleSubmit(async ({ email, password }) => {
    setRequestError(null);

    try {
      await login({ email, password });
    } catch (error) {
      setRequestError(readErrorMessage(error));
    }
  });

  return (
    <form className='space-y-4' onSubmit={submit} noValidate>
      <AuthenticationStatus message={requestError} />

      <label className='block'>
        <span className='mb-2 block text-[11px] font-bold tracking-[0.14em] text-white/48'>
          EMAIL ADDRESS
        </span>
        <input
          {...register('email')}
          className={fieldClassName}
          type='email'
          inputMode='email'
          autoComplete='email'
          placeholder='you@example.com'
        />
        <FieldError message={errors.email?.message} />
      </label>

      <PasswordField
        autoComplete='current-password'
        error={errors.password?.message}
        label='PASSWORD'
        registration={register('password')}
      />

      <div className='flex items-center justify-between gap-4 text-xs'>
        <label className='flex cursor-pointer items-center gap-2 text-white/55'>
          <input
            {...register('rememberMe')}
            type='checkbox'
            className='size-4 rounded border-border bg-surface accent-primary'
          />
          Remember me
        </label>
        <span
          className='cursor-not-allowed font-semibold text-primary/45'
          title='Password reset is planned after the V1 release'
          aria-disabled='true'
        >
          Forgot password?
        </span>
      </div>

      <button
        type='submit'
        disabled={isSubmitting}
        className='h-12 w-full rounded-xl bg-primary text-sm font-extrabold text-[#041216] shadow-[0_0_28px_rgba(0,229,255,0.18)] transition hover:bg-[#42edff] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
      >
        {isSubmitting ? 'Signing in…' : 'Log In'}
      </button>
    </form>
  );
}

function RegisterForm({
  onRegistered,
}: {
  onRegistered: (email: string, message: string) => void;
}) {
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RegisterFormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    resolver: zodResolver(registerCredentialsSchema),
  });
  const password = useWatch({
    control,
    name: 'password',
  });
  const strength = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const submit = handleSubmit(async (values) => {
    setRequestError(null);

    try {
      const lastName = values.lastName.trim();
      const message = await registerRequest({
        firstName: values.firstName.trim(),
        ...(lastName ? { lastName } : {}),
        displayName: values.displayName.trim(),
        email: values.email,
        password: values.password,
      });

      onRegistered(values.email, message);
    } catch (error) {
      setRequestError(readErrorMessage(error));
    }
  });

  return (
    <form className='space-y-4' onSubmit={submit} noValidate>
      <AuthenticationStatus message={requestError} />

      <div className='grid gap-4 sm:grid-cols-2'>
        <label className='block'>
          <span className='mb-2 block text-[11px] font-bold tracking-[0.14em] text-white/48'>
            FIRST NAME
          </span>
          <input
            {...register('firstName')}
            className={fieldClassName}
            autoComplete='given-name'
            placeholder='John'
          />
          <FieldError message={errors.firstName?.message} />
        </label>

        <label className='block'>
          <span className='mb-2 block text-[11px] font-bold tracking-[0.14em] text-white/48'>
            LAST NAME
          </span>
          <input
            {...register('lastName')}
            className={fieldClassName}
            autoComplete='family-name'
            placeholder='Smith'
          />
          <FieldError message={errors.lastName?.message} />
        </label>
      </div>
      <label className='block'>
        <span className='mb-2 block text-[11px] font-bold tracking-[0.14em] text-white/48'>
          DISPLAY NAME
        </span>
        <input
          {...register('displayName')}
          className={fieldClassName}
          autoComplete='nickname'
          placeholder='AuctionJohn'
        />
        <FieldError message={errors.displayName?.message} />
      </label>
      <label className='block'>
        <span className='mb-2 block text-[11px] font-bold tracking-[0.14em] text-white/48'>
          EMAIL ADDRESS
        </span>
        <input
          {...register('email')}
          className={fieldClassName}
          type='email'
          inputMode='email'
          autoComplete='email'
          placeholder='you@example.com'
        />
        <FieldError message={errors.email?.message} />
      </label>

      <PasswordField
        autoComplete='new-password'
        error={errors.password?.message}
        label='PASSWORD'
        registration={register('password')}
      />

      <div
        className='-mt-1 grid grid-cols-4 gap-1.5'
        aria-label='Password strength'
      >
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={cn(
              'h-1 rounded-full transition',
              strength >= level
                ? strength <= 1
                  ? 'bg-danger'
                  : strength <= 3
                    ? 'bg-primary'
                    : 'bg-success'
                : 'bg-white/8',
            )}
          />
        ))}
      </div>

      <PasswordField
        autoComplete='new-password'
        error={errors.confirmPassword?.message}
        label='CONFIRM PASSWORD'
        registration={register('confirmPassword')}
      />

      <button
        type='submit'
        disabled={isSubmitting}
        className='h-12 w-full rounded-xl bg-primary text-sm font-extrabold text-[#041216] shadow-[0_0_28px_rgba(0,229,255,0.18)] transition hover:bg-[#42edff] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
      >
        {isSubmitting ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  );
}

export function AuthScreen() {
  const { logout, status, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <main className='grid min-h-svh place-items-center bg-background px-5'>
        <div className='flex flex-col items-center gap-5 text-center'>
          <CBeaveLogo />
          <div className='size-7 animate-spin rounded-full border-2 border-white/10 border-t-primary' />
          <p className='text-sm text-muted'>Restoring your secure session…</p>
        </div>
      </main>
    );
  }

  if (status === 'authenticated' && user) {
    return (
      <main className='relative grid min-h-svh place-items-center overflow-hidden bg-background px-5 py-12'>
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,229,255,0.12),transparent_38%),radial-gradient(circle_at_10%_90%,rgba(168,85,247,0.12),transparent_35%)]' />
        <section className='relative w-full max-w-md rounded-3xl border border-border bg-surface/90 p-7 text-center shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-9'>
          <CBeaveLogo className='justify-center' />
          <p className='mt-8 text-xs font-bold tracking-[0.18em] text-primary'>
            SESSION READY
          </p>
          <h1 className='mt-3 text-3xl font-extrabold tracking-tight'>
            Welcome back, {user.profile?.displayName ?? user.email}
          </h1>
          <p className='mt-3 text-sm leading-6 text-muted'>
            Your secure session has been restored. The marketplace experience is
            the next frontend slice.
          </p>
          <Link
            href='/'
            className='mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-[#041216]'
          >
            Continue to CBeave
          </Link>
          <button
            type='button'
            onClick={() => void logout()}
            className='mt-3 h-11 w-full rounded-xl border border-border text-sm font-semibold text-white/65 transition hover:bg-white/5 hover:text-white'
          >
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className='relative isolate min-h-svh overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-12'>
      <div className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(0,229,255,0.15),transparent_34%),radial-gradient(circle_at_8%_82%,rgba(168,85,247,0.13),transparent_32%),linear-gradient(145deg,transparent_35%,rgba(255,255,255,0.018)_35.5%,transparent_36%)]' />
      <div className='pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-px max-w-5xl bg-linear-to-r from-transparent via-primary/70 to-transparent' />

      <div className='mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-lg flex-col items-center justify-center sm:min-h-[calc(100svh-6rem)]'>
        <CBeaveLogo className='mb-7' />

        <section className='w-full rounded-[1.7rem] border border-border bg-surface/92 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8'>
          <div className='grid grid-cols-2 rounded-xl bg-[#0b0b10] p-1'>
            {(['login', 'register'] as const).map((tab) => {
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
                  {tab === 'login' ? 'Log In' : 'Register'}
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
            <>
              <AuthenticationStatus message={successMessage} tone='success' />
              {successMessage && <div className='h-4' />}
              <LoginForm />
            </>
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
