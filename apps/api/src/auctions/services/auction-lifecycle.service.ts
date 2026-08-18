import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import {
  AuctionEventType,
  AuctionStatus,
  Prisma,
} from '../../generated/prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuctionBiddingGateway } from '../../bidding/gateways/auction-bidding.gateway';
import { maskBidderDisplayNameOrDefault } from '../../bidding/utils/mask-bidder-display-name.util';
import { mapPodiumBid } from '../../bidding/mappers/map-podium-bid.mapper';
import { bidderDisplayNameSelect } from '../../bidding/queries/bidder-display-name.select';
import {
  SoldAuctionResult,
  UnsoldAuctionResult,
} from '../../notifications/types/create-auction-result-notifications.input';

const AUCTION_LIFECYCLE_INTERVAL_MS = 10_000;
const AUCTION_LIFECYCLE_BATCH_SIZE = 50;

@Injectable()
export class AuctionLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auctionBiddingGateway: AuctionBiddingGateway,
  ) {}
  private readonly logger = new Logger(AuctionLifecycleService.name);
  private reconciliationRunning = false;

  @Interval(AUCTION_LIFECYCLE_INTERVAL_MS)
  async reconcileAuctionLifecycle(): Promise<void> {
    if (this.reconciliationRunning) {
      return;
    }

    this.reconciliationRunning = true;

    try {
      const activatedCount = await this.activateDueScheduledAuctions();
      const completedCount = await this.completeExpiredActiveAuctions();

      if (activatedCount > 0 || completedCount > 0) {
        this.logger.log(
          `Auction lifecycle reconciled: ${activatedCount} activated, ` +
            `${completedCount} completed`,
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknow lifecycle error';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Auction lifecycle reconciliation failed: ${message}`,
        stack,
      );
    } finally {
      this.reconciliationRunning = false;
    }
  }
  private async completeExpiredActiveAuctions(): Promise<number> {
    const now = new Date();

    const expiredAuctions = await this.prisma.auction.findMany({
      where: {
        status: AuctionStatus.ACTIVE,
        currentEndAt: {
          lte: now,
        },
        deletedAt: null,
      },
      orderBy: [
        {
          currentEndAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      take: AUCTION_LIFECYCLE_BATCH_SIZE,
      select: {
        id: true,
        sellerId: true,
        title: true,
        currency: true,
        currentPrice: true,
        bidCount: true,
        rowVersion: true,
        reservePrice: true,
        bids: {
          orderBy: [
            {
              sequenceNo: 'desc',
            },
          ],
          take: 3,
          select: {
            id: true,
            bidderId: true,
            amount: true,
            sequenceNo: true,
            bidder: bidderDisplayNameSelect,
          },
        },
      },
    });

    let completedCount = 0;

    for (const auction of expiredAuctions) {
      const highestBid = auction.bids[0] ?? null;

      const reserveMet =
        highestBid !== null &&
        (auction.reservePrice === null ||
          highestBid.amount.gte(auction.reservePrice));

      const nextStatus = reserveMet ? AuctionStatus.SOLD : AuctionStatus.UNSOLD;

      const completed = await this.prisma.$transaction(async (transaction) => {
        const updateResult = await transaction.auction.updateMany({
          where: {
            id: auction.id,
            status: AuctionStatus.ACTIVE,
            currentEndAt: {
              lte: now,
            },
            deletedAt: null,
            rowVersion: auction.rowVersion,
          },
          data: {
            status: nextStatus,
            endedAt: now,
            winnerUserId: reserveMet ? highestBid.bidderId : null,
            winningBidId: reserveMet ? highestBid.id : null,
            soldPrice: reserveMet ? highestBid.amount : null,
            rowVersion: {
              increment: 1,
            },
          },
        });

        if (updateResult.count !== 1) {
          return false;
        }

        await transaction.auctionEvent.create({
          data: {
            auctionId: auction.id,
            bidId: highestBid?.id ?? null,
            eventType: AuctionEventType.ENDED,
          },
        });

        await this.notificationsService.createAuctionResultNotifications(
          transaction,
          {
            auctionId: auction.id,
            auctionTitle: auction.title,
            sellerId: auction.sellerId,
            currency: auction.currency,
            result: this.buildAuctionResult(reserveMet, highestBid),
          },
        );

        return true;
      });

      if (completed) {
        completedCount += 1;

        const winnerDisplayName =
          reserveMet && highestBid
            ? maskBidderDisplayNameOrDefault(highestBid.bidder)
            : null;

        this.auctionBiddingGateway.broadcastAuctionEnded({
          auctionId: auction.id,
          status: nextStatus,
          currency: auction.currency,
          finalPrice: auction.currentPrice.toFixed(2),
          bidCount: auction.bidCount,
          reserveMet,
          endedAt: now,
          winnerDisplayName,

          podiumBids: reserveMet ? auction.bids.map(mapPodiumBid) : [],
        });
      }
    }

    return completedCount;
  }

  private async activateDueScheduledAuctions(): Promise<number> {
    const now = new Date();

    const dueAuctions = await this.prisma.auction.findMany({
      where: {
        status: AuctionStatus.SCHEDULED,
        scheduledStartAt: {
          lte: now,
        },
        currentEndAt: {
          not: null,
        },
        deletedAt: null,
      },
      orderBy: [
        {
          scheduledStartAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      take: AUCTION_LIFECYCLE_BATCH_SIZE,
      select: {
        id: true,
        rowVersion: true,
        currentEndAt: true,
      },
    });

    let activatedCount = 0;

    for (const auction of dueAuctions) {
      const activated = await this.prisma.$transaction(async (transaction) => {
        const updateResult = await transaction.auction.updateMany({
          where: {
            id: auction.id,
            status: AuctionStatus.SCHEDULED,
            scheduledStartAt: {
              lte: now,
            },
            currentEndAt: {
              not: null,
            },
            deletedAt: null,
            rowVersion: auction.rowVersion,
          },
          data: {
            status: AuctionStatus.ACTIVE,
            startedAt: now,
            rowVersion: {
              increment: 1,
            },
          },
        });

        if (updateResult.count !== 1) {
          return false;
        }

        await transaction.auctionEvent.create({
          data: {
            auctionId: auction.id,
            eventType: AuctionEventType.STARTED,
          },
        });

        return true;
      });

      if (activated) {
        activatedCount += 1;

        if (auction.currentEndAt) {
          this.auctionBiddingGateway.broadcastAuctionStarted({
            auctionId: auction.id,
            status: AuctionStatus.ACTIVE,
            startedAt: now.toISOString(),
            currentEndAt: auction.currentEndAt.toISOString(),
          });
        }
      }
    }

    return activatedCount;
  }

  private buildAuctionResult(
    reserveMet: boolean,
    highestBid: {
      id: string;
      bidderId: string;
      amount: Prisma.Decimal;
    } | null,
  ): SoldAuctionResult | UnsoldAuctionResult {
    if (reserveMet && highestBid) {
      return {
        sold: true,
        winnerUserId: highestBid.bidderId,
        winningBidId: highestBid.id,
        soldPrice: highestBid.amount.toFixed(2),
      };
    }

    return {
      sold: false,
      highestBidId: highestBid?.id ?? null,
    };
  }
}
