import { cn } from '@/lib/utils/cn';

export function AuthenticationStatus({
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
