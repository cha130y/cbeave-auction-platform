'use client';

import { createAuctionDraft } from '@/features/auctions/api/auctions.api';
import { AuctionDraftForm } from '@/features/auctions/components/auction-draft-form';
import { mapAuctionDraftInput } from '@/features/auctions/mappers/map-auction-draft-form-values';
import type { AuctionDraftFormValues } from '@/features/auctions/schemas/auction-draft.schemas';
import { useAuth } from '@/features/auth/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const defaultValues: AuctionDraftFormValues = {
  categoryId: '',
  title: '',
  description: '',
  startingPrice: '',
  reservePrice: '',
  minBidIncrement: '',
  scheduledStartAt: '',
  scheduledEndAt: '',
};

export function CreateAuctionScreen() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth');
    }
  }, [router, status]);

  if (status !== 'authenticated') {
    return (
      <div className='mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-96 animate-pulse rounded-3xl border border-border bg-surface' />
      </div>
    );
  }

  async function createDraft(values: AuctionDraftFormValues) {
    const draft = await createAuctionDraft(mapAuctionDraftInput(values));

    router.push(`/sell/${draft.id}`);
  }

  return (
    <AuctionDraftForm
      defaultValues={defaultValues}
      eyebrow='Seller workspace'
      title='Create an auction'
      description='Add the auction details now. Images can be uploaded before publication.'
      submitLabel='Save auction draft'
      submittingLabel='Saving draft...'
      onSubmit={createDraft}
    />
  );
}
