import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  AdminActionType,
  AuctionEventType,
  AuctionStatus,
  ParticipantStatus,
} from '../generated/prisma/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { CancelAuctionResponseDto } from './dto/cancel-auction-response.dto';
import { adminCancellableAuctionSelect } from './queries/admin-cancellable-auction.select';
import { CancelAuctionInput } from './types/cancel-auction.input';
import { ListAdminAuctionsInput } from './types/list-admin-auctions.input';
import { ListAdminAuctionsResponseDto } from './dto/list-admin-auctions-response.dto';
import { adminAuctionSummarySelect } from './queries/admin-auction-summary.select';
import { mapAdminAuctionSummaryResponse } from './mappers/map-admin-auction-summary-response.mapper';

const CANCELLABLE_AUCTION_STATUSES: AuctionStatus[] = [
  AuctionStatus.SCHEDULED,
  AuctionStatus.ACTIVE,
];

@Injectable()
export class AdminAuctionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listAuctions(
    input: ListAdminAuctionsInput,
  ): Promise<ListAdminAuctionsResponseDto> {
    if (input.cursor) {
      const cursorExists = await this.prisma.auction.findFirst({
        where: {
          id: input.cursor,
          deletedAt: null,
          ...(input.status ? { status: input.status } : {}),
        },
        select: {
          id: true,
        },
      });

      if (!cursorExists) {
        throw new BadRequestException('Invalid auction cursor');
      }
    }

    const auctions = await this.prisma.auction.findMany({
      where: {
        deletedAt: null,
        ...(input.status ? { status: input.status } : {}),
      },
      ...(input.cursor
        ? {
            cursor: {
              id: input.cursor,
            },
            skip: 1,
          }
        : {}),
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: input.limit + 1,
      select: adminAuctionSummarySelect,
    });

    const hasMore = auctions.length > input.limit;
    const page = hasMore ? auctions.slice(0, input.limit) : auctions;
    const lastAuction = page[page.length - 1];

    return {
      items: page.map(mapAdminAuctionSummaryResponse),
      nextCursor: hasMore && lastAuction ? lastAuction.id : null,
    };
  }

  async cancelAuction(
    input: CancelAuctionInput,
  ): Promise<CancelAuctionResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const auction = await transaction.auction.findUnique({
        where: {
          id: input.auctionId,
        },
        select: adminCancellableAuctionSelect,
      });

      if (!auction) {
        throw new NotFoundException('Auction not found');
      }

      if (auction.status === AuctionStatus.CANCELLED) {
        return auction;
      }

      if (!CANCELLABLE_AUCTION_STATUSES.includes(auction.status)) {
        throw new ConflictException(
          'Only scheduled or active auctions can be cancelled',
        );
      }

      const now = new Date();

      const updateResult = await transaction.auction.updateMany({
        where: {
          id: auction.id,
          status: {
            in: CANCELLABLE_AUCTION_STATUSES,
          },
          rowVersion: auction.rowVersion,
          deletedAt: null,
        },
        data: {
          status: AuctionStatus.CANCELLED,
          cancellationReason: input.reason,
          endedAt: now,
          winnerUserId: null,
          winningBidId: null,
          soldPrice: null,
          rowVersion: {
            increment: 1,
          },
        },
      });

      if (updateResult.count !== 1) {
        throw new ConflictException('Auction changed; reload and try again');
      }

      await transaction.auctionEvent.create({
        data: {
          auctionId: auction.id,
          actorUserId: input.adminUserId,
          eventType: AuctionEventType.CANCELLED,
        },
      });

      await transaction.adminAction.create({
        data: {
          adminUserId: input.adminUserId,
          auctionId: auction.id,
          actionType: AdminActionType.CANCEL_AUCTION,
          note: `Cancelled auction "${auction.title}": ${input.reason}`,
        },
      });

      const watchers = await transaction.watchlist.findMany({
        where: {
          auctionId: auction.id,
        },
        select: {
          userId: true,
        },
      });

      const participants = await transaction.auctionParticipant.findMany({
        where: {
          auctionId: auction.id,
          status: ParticipantStatus.JOINED,
        },
        select: {
          userId: true,
        },
      });

      const bidders = await transaction.bid.findMany({
        where: {
          auctionId: auction.id,
        },
        distinct: ['bidderId'],
        select: {
          bidderId: true,
        },
      });

      const affectedUserIds = new Set<string>([
        auction.sellerId,
        ...watchers.map((watcher) => watcher.userId),
        ...participants.map((participant) => participant.userId),
        ...bidders.map((bidder) => bidder.bidderId),
      ]);

      await this.notificationsService.createAuctionCancellationNotifications(
        transaction,
        {
          userIds: [...affectedUserIds],
          auctionId: auction.id,
          auctionTitle: auction.title,
          reason: input.reason,
        },
      );

      return transaction.auction.findUniqueOrThrow({
        where: {
          id: auction.id,
        },
        select: adminCancellableAuctionSelect,
      });
    });
  }
}
