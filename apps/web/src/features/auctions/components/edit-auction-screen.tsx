'use client';

import { updateOwnedAuctionDraft } from '@/features/auctions/api/auctions.api';
import { AuctionDraftForm } from '@/features/auctions/components/auction-draft-form';
import {
  mapAuctionDraftFormValues,
  mapAuctionDraftInput,
} from '@/features/auctions/mappers/map-auction-draft-form-values';
import { useOwnedAuctionDraft } from '@/features/auctions/queries/auction.queries';
import { AuctionDraftFormValues } from '@/features/auctions/schemas/auction-draft.schemas';
import { useAuth } from '@/features/auth/use-auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type EditAuctionScreenProps = {
  auctionId: string;
};

export function EditAuctionScreen({
  auctionId,
}: EditAuctionScreenProps) {
  const router = useRouter();
  const { status } = useAuth();

  const draftQuery = useOwnedAuctionDraft(
    status === 'authenticated' ? auctionId : '',
  );

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth');
    }
  }, [router, status]);

  if (status !== 'authenticated' || draftQuery.isPending) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-120 animate-pulse rounded-3xl border border-border bg-surface' />
      </div>
    );
  }

  if (draftQuery.isError) {
    return (
      <div className='mx-auto max-w-3xl px-4 py-20 text-center sm:px-6'>
        <h1 className='text-3xl font-black text-foreground'>
          Auction draft could not be loaded
        </h1>

        <p className='mt-3 text-muted'>
          The draft may not exist or may belong to another seller.
        </p>

        <Link
          href='/sell'
          className='mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-bold text-background'
        >
          Create an auction
        </Link>
      </div>
    );
  }

  async function updateDraft(values: AuctionDraftFormValues) {
    const draft = await updateOwnedAuctionDraft({
      auctionId,
      ...mapAuctionDraftInput(values),
    });

    router.push(`/sell/${draft.id}`);
  }

  return (
    <AuctionDraftForm
      defaultValues={mapAuctionDraftFormValues(draftQuery.data)}
      eyebrow='Seller workspace'
      title='Edit auction draft'
      description='Update the auction details before uploading images and publishing.'
      submitLabel='Save changes'
      submittingLabel='Saving changes...'
      onSubmit={updateDraft}
    />
  );
}
