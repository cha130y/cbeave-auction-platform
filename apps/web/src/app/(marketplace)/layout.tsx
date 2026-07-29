import { MarketplaceHeader } from '@/components/layout/marketplace-header';
import { ReactNode } from 'react';

type MarketplaceLayoutProps = {
  children: ReactNode;
};

export default function MarketplaceLayout({
  children,
}: MarketplaceLayoutProps) {
  return (
    <div className='flex min-h-screen flex-col bg-background'>
      <MarketplaceHeader />

      <main className='flex-1'>{children}</main>
    </div>
  );
}
