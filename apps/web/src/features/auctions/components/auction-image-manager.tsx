'use client';

import {
  addAuctionImage,
  deleteAuctionImage,
} from '@/features/auctions/api/auctions.api';
import { auctionQueryKeys } from '@/features/auctions/queries/auction.queries';
import type { AuctionDraftImage } from '@/features/auctions/schemas/auction-draft.schemas';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import type { FormEvent } from 'react';
import { useState } from 'react';

const maximumImageCount = 5;
const maximumImageSizeBytes = 5 * 1024 * 1024;

type AuctionImageManagerProps = {
  auctionId: string;
  images: AuctionDraftImage[];
};

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'The image request could not be completed.';
}

export function AuctionImageManager({
  auctionId,
  images,
}: AuctionImageManagerProps) {
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const hasReachedImageLimit = images.length >= maximumImageCount;

  async function refreshDraft() {
    await queryClient.invalidateQueries({
      queryKey: auctionQueryKeys.draft(auctionId),
    });
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const image = formData.get('image');
    const altText = formData.get('altText');

    setRequestError(null);

    if (!(image instanceof File) || image.size === 0) {
      setRequestError('Please select an image.');
      return;
    }

    if (image.size > maximumImageSizeBytes) {
      setRequestError('The image must be 5 MB or smaller.');
      return;
    }

    setIsUploading(true);

    try {
      await addAuctionImage({
        auctionId,
        image,
        altText: typeof altText === 'string' ? altText : undefined,
      });

      form.reset();
      await refreshDraft();
    } catch (error) {
      setRequestError(readErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(imageId: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this image?',
    );

    if (!confirmed) {
      return;
    }

    setRequestError(null);
    setDeletingImageId(imageId);

    try {
      await deleteAuctionImage({
        auctionId,
        imageId,
      });

      await refreshDraft();
    } catch (error) {
      setRequestError(readErrorMessage(error));
    } finally {
      setDeletingImageId(null);
    }
  }

  return (
    <div className='mt-4'>
      {requestError && (
        <div
          className='mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
          role='alert'
        >
          {requestError}
        </div>
      )}

      {images.length > 0 ? (
        <div className='grid gap-4 sm:grid-cols-2'>
          {images.map((image) => (
            <div
              key={image.id}
              className='overflow-hidden rounded-2xl border border-border bg-background'
            >
              <div className='relative aspect-4/3 bg-surface'>
                <Image
                  src={image.url}
                  alt={image.altText ?? 'Auction image'}
                  fill
                  sizes='(max-width: 640px) 100vw, 50vw'
                  className='object-cover'
                />

                {image.isPrimary && (
                  <span className='absolute top-3 left-3 rounded-full bg-primary px-3 py-1 text-xs font-black text-background uppercase'>
                    Primary
                  </span>
                )}
              </div>

              <div className='flex items-center justify-between gap-4 p-4'>
                <p className='min-w-0 truncate text-sm text-muted'>
                  {image.altText ?? 'No alternative text'}
                </p>

                <button
                  type='button'
                  className='shrink-0 text-sm font-bold text-danger transition hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-50'
                  disabled={deletingImageId !== null || isUploading}
                  onClick={() => handleDelete(image.id)}
                >
                  {deletingImageId === image.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className='text-sm text-muted'>No images have been uploaded yet.</p>
      )}

      {hasReachedImageLimit ? (
        <div className='mt-6 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-4'>
          <p className='text-sm font-bold text-warning'>
            Maximum of five images uploaded
          </p>

          <p className='mt-1 text-xs text-muted'>
            Delete an existing image before uploading another one.
          </p>
        </div>
      ) : (
        <form
          className='mt-6 space-y-4 rounded-2xl border border-dashed border-border bg-background p-4'
          onSubmit={handleUpload}
        >
          <div>
            <label
              htmlFor='auction-image'
              className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'
            >
              Image
            </label>

            <input
              id='auction-image'
              name='image'
              type='file'
              accept='image/jpeg,image/png,image/webp'
              required
              disabled={hasReachedImageLimit || isUploading}
              className='block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:font-bold file:text-background hover:file:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50'
            />
          </div>

          <div>
            <label
              htmlFor='auction-image-alt-text'
              className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'
            >
              Alternative text
              <span className='ml-1 font-normal tracking-normal normal-case'>
                (optional)
              </span>
            </label>

            <input
              id='auction-image-alt-text'
              name='altText'
              type='text'
              maxLength={255}
              placeholder='Describe the item shown in this image'
              disabled={hasReachedImageLimit || isUploading}
              className='h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none transition placeholder:text-muted/50 focus:border-primary/70 focus:ring-3 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50'
            />
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3'>
            <p className='text-xs text-muted'>
              JPEG, PNG or WebP. Maximum 5 MB. {images.length}/
              {maximumImageCount} images.
            </p>

            <button
              type='submit'
              disabled={hasReachedImageLimit || isUploading}
              className='min-h-10 rounded-full bg-primary px-5 text-sm font-black text-background transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isUploading ? 'Uploading...' : 'Upload image'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
