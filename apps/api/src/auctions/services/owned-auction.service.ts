import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AuctionEventType,
  AuctionStatus,
  ParticipantStatus,
} from '../../generated/prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { CancelOwnedAuctionInput } from '../types/cancel-owned-auction.input';
import { CancelOwnedAuctionResponseDto } from '../dto/cancel-owned-auction-response.dto';
import { ListOwnedAuctionsInput } from '../types/list-owned-auctions.input';
import { ListOwnedAuctionsResponseDto } from '../dto/list-owned-auctions-response.dto';
import { cancellableOwnedAuctionSelect } from '../queries/cancellable-owned-auction.select';
import { ownedAuctionSummarySelect } from '../queries/owned-auction-summary.select';
import { mapCancelOwnedAuctionResponse } from '../mappers/map-cancel-owned-auction-response.mapper';
import { mapOwnedAuctionSummaryResponse } from '../mappers/map-owned-auction-summary-response.mapper';
import { paginate } from '../../common/pagination/paginate.util';

/**
 * A seller's own view of auctions that already left the draft desk: listing
 * them and cancelling one that is still only scheduled.
 */
@Injectable()
export class OwnedAuctionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listOwned(
    input: ListOwnedAuctionsInput,
  ): Promise<ListOwnedAuctionsResponseDto> {
    const auctions = await this.prisma.auction.findMany({
      where: {
        sellerId: input.sellerId,
        deletedAt: null,
        ...(input.status
          ? {
              status: input.status,
            }
          : {}),
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
          updatedAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: input.limit + 1,
      select: ownedAuctionSummarySelect,
    });

    const { page, nextCursor } = paginate(
      auctions,
      input.limit,
      (auction) => auction.id,
    );

    return {
      items: page.map(mapOwnedAuctionSummaryResponse),
      nextCursor,
    };
  }

  async cancelOwnedScheduled(
    input: CancelOwnedAuctionInput,
  ): Promise<CancelOwnedAuctionResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const auction = await transaction.auction.findFirst({
        where: {
          id: input.auctionId,
          sellerId: input.sellerId,
          deletedAt: null,
        },
        select: cancellableOwnedAuctionSelect,
      });

      if (!auction) {
        throw new NotFoundException('Auction not found');
      }

      if (auction.status === AuctionStatus.CANCELLED) {
        return mapCancelOwnedAuctionResponse(auction);
      }

      if (auction.status !== AuctionStatus.SCHEDULED) {
        throw new ConflictException(
          'Only scheduled auctions can be cancelled by the seller',
        );
      }

      if (auction._count.bids > 0) {
        throw new ConflictException(
          'Auctions with accepted bids cannot be cancelled',
        );
      }

      const now = new Date();

      const updateResult = await transaction.auction.updateMany({
        where: {
          id: auction.id,
          sellerId: input.sellerId,
          status: AuctionStatus.SCHEDULED,
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
          actorUserId: input.sellerId,
          eventType: AuctionEventType.CANCELLED,
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

      const affectedUserIds = new Set<string>([
        ...watchers.map((watcher) => watcher.userId),
        ...participants.map((participant) => participant.userId),
      ]);

      affectedUserIds.delete(input.sellerId);

      await this.notificationsService.createAuctionCancellationNotifications(
        transaction,
        {
          userIds: [...affectedUserIds],
          auctionId: auction.id,
          auctionTitle: auction.title,
          reason: input.reason,
        },
      );

      const cancelledAuction = await transaction.auction.findUniqueOrThrow({
        where: {
          id: auction.id,
        },
        select: cancellableOwnedAuctionSelect,
      });

      return mapCancelOwnedAuctionResponse(cancelledAuction);
    });
  }
}
