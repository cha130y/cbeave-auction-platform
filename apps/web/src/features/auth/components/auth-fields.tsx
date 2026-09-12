'use client';

import { cn } from '@/lib/utils/cn';
import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

const fieldClassName =
  'h-12 w-full rounded-xl border border-border bg-[#0d0d12]/85 px-4 text-[15px] text-white outline-none transition placeholder:text-white/25 focus:border-primary/70 focus:ring-3 focus:ring-primary/10';

const fieldLabelClassName =
  'mb-2 block text-[11px] font-bold tracking-[0.14em] text-white/48';

export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className='mt-1.5 text-xs font-medium text-danger' role='alert'>
      {message}
    </p>
  );
}

export function TextField({
  autoComplete,
  error,
  inputMode,
  label,
  placeholder,
  registration,
  type = 'text',
}: {
  autoComplete: string;
  error?: string;
  inputMode?: 'email';
  label: string;
  placeholder?: string;
  registration: UseFormRegisterReturn;
  type?: 'email' | 'text';
}) {
  return (
    <label className='block'>
      <span className={fieldLabelClassName}>{label}</span>
      <input
        {...registration}
        className={fieldClassName}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      <FieldError message={error} />
    </label>
  );
}

export function PasswordField({
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
      <span className={fieldLabelClassName}>{label}</span>
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

export function AuthSubmitButton({
  isSubmitting,
  label,
  pendingLabel,
}: {
  isSubmitting: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type='submit'
      disabled={isSubmitting}
      className='h-12 w-full rounded-xl bg-primary text-sm font-extrabold text-[#041216] shadow-[0_0_28px_rgba(0,229,255,0.18)] transition hover:bg-[#42edff] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
    >
      {isSubmitting ? pendingLabel : label}
    </button>
  );
}
