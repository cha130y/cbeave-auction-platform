'use client';

import {
  auctionDraftImageSchema,
  auctionDraftResponseSchema,
  listOwnedAuctionsResponseSchema,
  publishAuctionResponseSchema,
  type AuctionDraft,
  type AuctionDraftImage,
  type ListOwnedAuctionsResponse,
  type OwnedAuctionStatus,
  type PublishedAuction,
} from '@/features/auctions/schemas/auction-draft.schemas';
import {
  ListHotAuctionsResponse,
  listHotAuctionsResponseSchema,
  ListPublicAuctionsResponse,
  listPublicAuctionsResponseSchema,
  PublicAuctionDetail,
  publicAuctionDetailSchema,
} from '@/features/auctions/schemas/auction.schemas';
import { apiRequest } from '@/lib/api/api-client';

export type ListPublicAuctionsParams = {
  limit?: number;
  categoryId?: string;
  cursor?: string;
};

export type ListOwnedAuctionsParams = {
  limit?: number;
  status?: OwnedAuctionStatus;
  cursor?: string;
};

export type CreateAuctionDraftInput = {
  categoryId: string;
  title: string;
  description: string;
  startingPrice: string;
  reservePrice: string | null;
  minBidIncrement: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
};

export type UpdateAuctionDraftInput = CreateAuctionDraftInput & {
  auctionId: string;
};

export type AddAuctionImageInput = {
  auctionId: string;
  image: File;
  altText?: string;
};

export type DeleteAuctionImageInput = {
  auctionId: string;
  imageId: string;
};

function createQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

export async function listPublicAuctions(
  params: ListPublicAuctionsParams = {},
): Promise<ListPublicAuctionsResponse> {
  const queryString = createQueryString(params);

  return listPublicAuctionsResponseSchema.parse(
    await apiRequest<unknown>(`/auctions${queryString}`),
  );
}

export async function listHotAuctions(
  limit = 10,
): Promise<ListHotAuctionsResponse> {
  const queryString = createQueryString({ limit });

  return listHotAuctionsResponseSchema.parse(
    await apiRequest<unknown>(`/auctions/hot${queryString}`),
  );
}

export async function listOwnedAuctions(
  params: ListOwnedAuctionsParams = {},
): Promise<ListOwnedAuctionsResponse> {
  const queryString = createQueryString(params);

  return listOwnedAuctionsResponseSchema.parse(
    await apiRequest<unknown>(`/auctions/mine${queryString}`),
  );
}

export async function getPublicAuction(
  auctionId: string,
): Promise<PublicAuctionDetail> {
  return publicAuctionDetailSchema.parse(
    //encodeURIComponent() prevents unexpected route characters from changing the requested path
    await apiRequest<unknown>(`/auctions/${encodeURIComponent(auctionId)}`),
  );
}

export async function createAuctionDraft(
  input: CreateAuctionDraftInput,
): Promise<AuctionDraft> {
  return auctionDraftResponseSchema.parse(
    await apiRequest<unknown>('/auctions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
}

export async function getOwnedAuctionDraft(
  auctionId: string,
): Promise<AuctionDraft> {
  return auctionDraftResponseSchema.parse(
    await apiRequest<unknown>(
      `/auctions/${encodeURIComponent(auctionId)}/draft`,
    ),
  );
}

export async function deleteOwnedAuctionDraft(
  auctionId: string,
): Promise<void> {
  await apiRequest<void>(`/auctions/${encodeURIComponent(auctionId)}/draft`, {
    method: 'DELETE',
  });
}

export async function updateOwnedAuctionDraft({
  auctionId,
  ...input
}: UpdateAuctionDraftInput) {
  return auctionDraftResponseSchema.parse(
    await apiRequest<unknown>(
      `/auctions/${encodeURIComponent(auctionId)}/draft`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),
  );
}

export async function addAuctionImage({
  auctionId,
  image,
  altText,
}: AddAuctionImageInput): Promise<AuctionDraftImage> {
  const formData = new FormData();

  formData.append('image', image);

  const normalizedAltText = altText?.trim();

  if (normalizedAltText) {
    formData.append('altText', normalizedAltText);
  }

  return auctionDraftImageSchema.parse(
    await apiRequest<unknown>(
      `/auctions/${encodeURIComponent(auctionId)}/images`,
      {
        method: 'POST',
        body: formData,
      },
    ),
  );
}

export async function deleteAuctionImage({
  auctionId,
  imageId,
}: DeleteAuctionImageInput): Promise<void> {
  await apiRequest<void>(
    `/auctions/${encodeURIComponent(
      auctionId,
    )}/images/${encodeURIComponent(imageId)}`,
    {
      method: 'DELETE',
    },
  );
}

export async function publishAuction(
  auctionId: string,
): Promise<PublishedAuction> {
  return publishAuctionResponseSchema.parse(
    await apiRequest<unknown>(
      `/auctions/${encodeURIComponent(auctionId)}/publish`,
      {
        method: 'POST',
      },
    ),
  );
}
