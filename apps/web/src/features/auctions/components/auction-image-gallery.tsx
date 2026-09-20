'use client';

import type { PublicAuctionDetail } from '@/features/auctions/schemas/auction.schemas';
import { getPrimaryImage } from '@/features/auctions/utils/get-primary-image';
import Image from 'next/image';
import { useState } from 'react';

type AuctionImageGalleryProps = {
  images: PublicAuctionDetail['images'];
  title: string;
  sizes?: string;
};

export function AuctionImageGallery({
  images,
  title,
  sizes = '(max-width: 1024px) 100vw, 50vw',
}: AuctionImageGalleryProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // If nothing is selected yet, or the selected image disappeared after a
  // refetch, fall back to the primary image.
  const selectedImage =
    images.find((image) => image.id === selectedImageId) ??
    getPrimaryImage(images);

  return (
    <div>
      <div className='relative aspect-4/3 overflow-hidden rounded-3xl border border-border bg-surface'>
        <Image
          key={selectedImage.id}
          src={selectedImage.url}
          alt={selectedImage.altText ?? title}
          fill
          priority
          sizes={sizes}
          className='object-cover'
        />
      </div>

      {images.length > 1 && (
        <ul className='mt-4 grid grid-cols-5 gap-3'>
          {images.map((image, index) => {
            const isSelected = image.id === selectedImage.id;

            return (
              <li key={image.id}>
                <button
                  type='button'
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedImageId(image.id)}
                  className={`relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-surface transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isSelected
                      ? 'border-primary'
                      : 'border-border opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={image.url}
                    alt=''
                    fill
                    sizes='96px'
                    className='object-cover'
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
