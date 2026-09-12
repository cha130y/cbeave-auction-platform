import { CBeaveLogo } from '@/components/brand/cbeave-logo';
import { cn } from '@/lib/utils/cn';

export function AuthSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'size-7 animate-spin rounded-full border-2 border-white/10 border-t-primary',
        className,
      )}
    />
  );
}

export function AuthLoadingScreen({ message }: { message: string }) {
  return (
    <main className='grid min-h-svh place-items-center bg-background px-5'>
      <div className='flex flex-col items-center gap-5 text-center'>
        <CBeaveLogo />
        <AuthSpinner />
        <p className='text-sm text-muted'>{message}</p>
      </div>
    </main>
  );
}
