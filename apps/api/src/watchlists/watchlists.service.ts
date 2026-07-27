import { Injectable, NotFoundException } from '@nestjs/common';
import { AuctionStatus } from '../generated/prisma/enums';
import { PrismaService } from '../database/prisma.service';
import { WatchlistEntryResponseDto } from './dto/watchlist-entry-response.dto';
import { WatchAuctionInput } from './types/watch-auction.input';
import { ListWatchlistInput } from './types/list-watchlist.input';
import { ListWatchlistResponseDto } from './dto/list-watchlist-response.dto';
import { watchlistItemSelect } from './queries/watchlist-item.select';
import { mapWatchlistItemResponse } from './mappers/map-watchlist-item-response.mapper';

const PUBLIC_AUCTION_STATUSES: AuctionStatus[] = [
  AuctionStatus.SCHEDULED,
  AuctionStatus.ACTIVE,
  AuctionStatus.SOLD,
  AuctionStatus.UNSOLD,
];

@Injectable()
export class WatchlistsService {
  constructor(private readonly prisma: PrismaService) {}

  async watchAuction(
    input: WatchAuctionInput,
  ): Promise<WatchlistEntryResponseDto> {
    const auction = await this.prisma.auction.findFirst({
      where: {
        id: input.auctionId,
        status: {
          in: PUBLIC_AUCTION_STATUSES,
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const entry = await this.prisma.watchlist.upsert({
      where: {
        //@@id([userId, auctionId])
        userId_auctionId: {
          userId: input.userId,
          auctionId: input.auctionId,
        },
      },
      update: {},
      create: {
        userId: input.userId,
        auctionId: input.auctionId,
      },
      select: {
        auctionId: true,
        createdAt: true,
      },
    });

    return {
      auctionId: entry.auctionId,
      watched: true,
      createdAt: entry.createdAt,
    };
  }

  async unwatchAuction(input: WatchAuctionInput): Promise<void> {
    await this.prisma.watchlist.deleteMany({
      where: {
        userId: input.userId,
        auctionId: input.auctionId,
      },
    });
  }

  async listWatchlist(
    input: ListWatchlistInput,
  ): Promise<ListWatchlistResponseDto> {
    const entries = await this.prisma.watchlist.findMany({
      where: {
        userId: input.userId,
        auction: {
          status: {
            in: PUBLIC_AUCTION_STATUSES,
          },
          deletedAt: null,
        },
      },
      ...(input.cursor
        ? {
            cursor: {
              userId_auctionId: {
                userId: input.userId,
                auctionId: input.cursor,
              },
            },
            skip: 1,
          }
        : {}),
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          auctionId: 'desc',
        },
      ],
      take: input.limit + 1,
      select: watchlistItemSelect,
    });

    const hasMore = entries.length > input.limit;
    const page = hasMore ? entries.slice(0, input.limit) : entries;
    const lastEntry = page[page.length - 1];

    return {
      items: page.map(mapWatchlistItemResponse),
      nextCursor: hasMore && lastEntry ? lastEntry.auctionId : null,
    };
  }
}
