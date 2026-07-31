import { cn } from '@/lib/utils/cn';
import Image from 'next/image';

type CBeaveLogoProps = {
  className?: string;
  compact?: boolean;
};

export function CBeaveLogo({
  className,
  compact = false,
}: CBeaveLogoProps) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center', className)}
      aria-label='CBeave'
    >
      <Image
        src='/brand/cbeave-wordmark.png'
        alt=''
        width={720}
        height={184}
        priority
        className={cn('h-auto object-contain', compact ? 'w-24' : 'w-40')}
      />
    </span>
  );
}
