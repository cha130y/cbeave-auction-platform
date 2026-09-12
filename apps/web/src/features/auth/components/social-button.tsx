'use client';

import { getSocialLoginUrl } from '@/features/auth/api/auth.api';
import { cn } from '@/lib/utils/cn';

export function SocialButton({
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
      className='flex h-11 items-center justify-center gap-2.5 rounded-xl border border-border-strong bg-white/2.5 text-sm font-semibold text-white/82 transition hover:border-white/25 hover:bg-white/5.5 focus-visible:outline-2 focus-visible:outline-primary'
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
