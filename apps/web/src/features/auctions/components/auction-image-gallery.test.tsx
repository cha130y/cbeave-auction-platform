import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { PublicAuctionDetail } from '@/features/auctions/schemas/auction.schemas';

import { AuctionImageGallery } from './auction-image-gallery';

function createImage(
  index: number,
  overrides: Partial<PublicAuctionDetail['images'][number]> = {},
): PublicAuctionDetail['images'][number] {
  return {
    id: `00000000-0000-4000-8000-00000000000${index}`,
    url: `https://res.cloudinary.com/demo/image/upload/auction-${index}.webp`,
    altText: `View ${index}`,
    position: index - 1,
    isPrimary: false,
    ...overrides,
  };
}

describe('AuctionImageGallery', () => {
  it('shows the only image without a thumbnail strip', () => {
    render(
      <AuctionImageGallery
        title='Vintage camera'
        images={[createImage(1, { isPrimary: true })]}
      />,
    );

    expect(screen.getByRole('img', { name: 'View 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('starts on the primary image and lists every image as a thumbnail', () => {
    render(
      <AuctionImageGallery
        title='Vintage camera'
        images={[
          createImage(1),
          createImage(2, { isPrimary: true }),
          createImage(3),
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'View 2' })).toBeInTheDocument();

    const thumbnails = screen.getAllByRole('button');

    expect(thumbnails).toHaveLength(3);
    expect(thumbnails[1]).toHaveAttribute('aria-pressed', 'true');
    expect(thumbnails[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches the main image when a thumbnail is selected', async () => {
    const user = userEvent.setup();

    render(
      <AuctionImageGallery
        title='Vintage camera'
        images={[
          createImage(1, { isPrimary: true }),
          createImage(2),
          createImage(3),
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Show image 3 of 3' }));

    expect(screen.getByRole('img', { name: 'View 3' })).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'View 1' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show image 3 of 3' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('passes the sizes hint to the main image', () => {
    render(
      <AuctionImageGallery
        title='Vintage camera'
        images={[createImage(1, { isPrimary: true })]}
        sizes='288px'
      />,
    );

    expect(screen.getByRole('img', { name: 'View 1' })).toHaveAttribute(
      'sizes',
      '288px',
    );
  });

  it('falls back to the auction title when an image has no alt text', () => {
    render(
      <AuctionImageGallery
        title='Vintage camera'
        images={[createImage(1, { isPrimary: true, altText: null })]}
      />,
    );

    expect(
      screen.getByRole('img', { name: 'Vintage camera' }),
    ).toBeInTheDocument();
  });
});
