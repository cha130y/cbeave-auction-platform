import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuctionStatus, Prisma } from '../../generated/prisma/client';
import { ListHotAuctionsInput } from '../types/list-hot-auctions.input';
import { ListHotAuctionsResponseDto } from '../dto/list-hot-auctions-response.dto';
import { ListPublicAuctionsInput } from '../types/list-public-auctions.input';
import { ListPublicAuctionsResponseDto } from '../dto/list-public-auctions-response.dto';
import { PublicAuctionDetailResponseDto } from '../dto/public-auction-detail-response.dto';
import { publicAuctionDetailSelect } from '../queries/public-auction-detail.select';
import { publicAuctionSummarySelect } from '../queries/public-auction-summary.select';
import { mapPublicAuctionDetailResponse } from '../mappers/map-public-auction-detail-response.mapper';
import { mapPublicAuctionSummaryResponse } from '../mappers/map-public-auction-summary-response.mapper';
import { paginate } from '../../common/pagination/paginate.util';

const PUBLIC_AUCTION_STATUSES: AuctionStatus[] = [
  AuctionStatus.SCHEDULED,
  AuctionStatus.ACTIVE,
  AuctionStatus.SOLD,
  AuctionStatus.UNSOLD,
];

const PUBLIC_AUCTION_REQUIREMENTS = {
  scheduledStartAt: {
    not: null,
  },
  currentEndAt: {
    not: null,
  },
  publishedAt: {
    not: null,
  },
  auctionImages: {
    some: {
      isPrimary: true,
    },
  },
} satisfies Prisma.AuctionWhereInput;

/**
 * Read-only access to what the marketplace shows anyone. A draft only becomes
 * visible here once publication gave it a schedule, a published timestamp, and
 * a primary image.
 */
@Injectable()
export class AuctionCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listHot(
    input: ListHotAuctionsInput,
  ): Promise<ListHotAuctionsResponseDto> {
    const auctions = await this.prisma.auction.findMany({
      where: {
        status: AuctionStatus.ACTIVE,
        deletedAt: null,
        ...PUBLIC_AUCTION_REQUIREMENTS,
        currentEndAt: {
          gt: new Date(),
        },
      },
      orderBy: [
        {
          bidCount: 'desc',
        },
        {
          currentEndAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      take: input.limit,
      select: publicAuctionSummarySelect,
    });

    return {
      items: auctions.map(mapPublicAuctionSummaryResponse),
    };
  }

  async findPublicById(
    auctionId: string,
  ): Promise<PublicAuctionDetailResponseDto> {
    const auction = await this.prisma.auction.findFirst({
      where: {
        id: auctionId,
        status: {
          in: PUBLIC_AUCTION_STATUSES,
        },
        deletedAt: null,
        ...PUBLIC_AUCTION_REQUIREMENTS,
      },
      select: publicAuctionDetailSelect,
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    return mapPublicAuctionDetailResponse(auction);
  }

  async listPublic(
    input: ListPublicAuctionsInput,
  ): Promise<ListPublicAuctionsResponseDto> {
    const auctions = await this.prisma.auction.findMany({
      where: {
        status: {
          in: PUBLIC_AUCTION_STATUSES,
        },
        deletedAt: null,
        ...PUBLIC_AUCTION_REQUIREMENTS,
        ...(input.categoryId
          ? {
              categoryId: input.categoryId,
            }
          : {}),
      },
      orderBy: [
        {
          publishedAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: input.limit + 1, //check Is there another page? limit default=20
      ...(input.cursor
        ? {
            cursor: {
              id: input.cursor,
            },
            skip: 1, //skip current cursor id auction then start next cursor id for next page
          }
        : {}),
      select: publicAuctionSummarySelect,
    });

    const { page, nextCursor } = paginate(
      auctions,
      input.limit,
      (auction) => auction.id,
    );

    return {
      items: page.map(mapPublicAuctionSummaryResponse),
      nextCursor,
    };
  }
}
