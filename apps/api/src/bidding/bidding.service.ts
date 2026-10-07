import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PlaceBidInput } from './types/place-bid.input';
import { PlaceBidResponseDto } from './dto/place-bid-response.dto';
import {
  AuctionEventType,
  AuctionStatus,
  Prisma,
} from '../generated/prisma/client';
import { AcceptedBidResult } from './types/accepted-bid-result.type';
import {
  placeBidAuctionSelect,
  PlaceBidAuctionRecord,
} from './queries/place-bid-auction.select';
import { mapPlaceBidResponse } from './mappers/map-place-bid-response.mapper';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';
import { ListPublicBidsInput } from './types/list-public-bids.input';
import { ListPublicBidsResponseDto } from './dto/list-public-bids-response.dto';
import { publicBidHistorySelect } from './queries/public-bid-history.select';
import { mapPublicBidHistoryResponse } from './mappers/map-public-bid-history-response.mapper';
import { AuctionBiddingGateway } from './gateways/auction-bidding.gateway';
import { mapBidAcceptedEvent } from './mappers/map-bid-accepted-event.mapper';
import { NotificationsService } from '../notifications/notifications.service';
import { paginate } from '../common/pagination/paginate.util';
import { PUBLIC_AUCTION_STATUSES } from '../auctions/constants/public-auction.constant';
import { assertBidIsAcceptable } from './utils/assert-bid-is-acceptable.util';
import {
  resolveAntiSnipingExtension,
  type AntiSnipingExtension,
} from './utils/resolve-anti-sniping-extension.util';

type AcceptedBidWrite = {
  auction: PlaceBidAuctionRecord;
  amount: Prisma.Decimal;
  bidderId: string;
  clientRequestId: string;
  sequenceNo: number;
  placedAt: Date;
  extension: AntiSnipingExtension;
  extensionNumber: number;
};

@Injectable()
export class BiddingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auctionBiddingGateway: AuctionBiddingGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listPublicBidHistory(
    input: ListPublicBidsInput,
  ): Promise<ListPublicBidsResponseDto> {
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

    const bids = await this.prisma.bid.findMany({
      where: {
        auctionId: input.auctionId,
        ...(input.cursor !== undefined
          ? {
              sequenceNo: {
                gt: input.cursor,
              },
            }
          : {}),
      },
      select: publicBidHistorySelect,
      orderBy: {
        sequenceNo: 'asc',
      },
      take: input.limit + 1,
    });

    const { page, nextCursor } = paginate(
      bids,
      input.limit,
      (bid) => bid.sequenceNo,
    );

    return {
      items: page.map(mapPublicBidHistoryResponse),
      nextCursor,
    };
  }

  async placeBid(input: PlaceBidInput): Promise<PlaceBidResponseDto> {
    const amount = new Prisma.Decimal(input.amount);
    const now = new Date();

    if (amount.lte(0)) {
      throw new BadRequestException('Bid amount must be greater than zero');
    }

    try {
      const acceptedBid = await this.prisma.$transaction(
        (transaction) => this.acceptBid(transaction, input, amount, now),
        {
          //handle transactions that nearly the same time only one transaction can be accepted
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      const response = mapPlaceBidResponse(acceptedBid);

      // Broadcast only once the transaction committed, so nobody is shown a
      // price that a rolled-back bid never set.
      this.auctionBiddingGateway.broadcastAcceptedBid(
        mapBidAcceptedEvent(response),
      );

      return response;
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Bid request has already been processed');
        }

        if (error.code === 'P2034') {
          throw new ConflictException('Auction changed; reload and try again');
        }
      }
      throw error;
    }
  }

  /**
   * Claims the auction for this bid: the request has to be new, the auction has
   * to accept it, and the price move has to win the row-version race. Only then
   * are the bid and its side effects written.
   */
  private async acceptBid(
    transaction: Prisma.TransactionClient,
    input: PlaceBidInput,
    amount: Prisma.Decimal,
    now: Date,
  ): Promise<AcceptedBidResult> {
    const duplicateRequest = await transaction.bid.findUnique({
      where: {
        clientRequestId: input.clientRequestId,
      },
      select: {
        id: true,
      },
    });

    if (duplicateRequest) {
      throw new ConflictException('Bid request has already been processed');
    }

    const auction = await transaction.auction.findFirst({
      where: {
        id: input.auctionId,
        deletedAt: null,
      },
      select: placeBidAuctionSelect,
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const currentEndAt = assertBidIsAcceptable(
      auction,
      amount,
      input.bidderId,
      now,
    );

    const extension = resolveAntiSnipingExtension(
      currentEndAt,
      auction.extensionCount,
      now,
    );

    const sequenceNo = auction.bidCount + 1;

    const updateResult = await transaction.auction.updateMany({
      where: {
        id: auction.id,
        status: AuctionStatus.ACTIVE,
        currentEndAt: {
          gt: now,
        },
        deletedAt: null,
        rowVersion: auction.rowVersion,
      },
      data: {
        currentPrice: amount,
        bidCount: {
          increment: 1,
        },
        rowVersion: {
          increment: 1,
        },
        ...(extension.shouldExtend
          ? {
              currentEndAt: extension.newEndAt,
              extensionCount: {
                increment: 1,
              },
            }
          : {}),
      },
    });

    if (updateResult.count !== 1) {
      throw new ConflictException('Auction changed; reload and try again');
    }

    return this.writeAcceptedBid(transaction, {
      auction,
      amount,
      bidderId: input.bidderId,
      clientRequestId: input.clientRequestId,
      sequenceNo,
      placedAt: now,
      extension,
      extensionNumber: auction.extensionCount + 1,
    });
  }

  /**
   * Persists the accepted bid with everything that has to land in the same
   * transaction: the outbid notice, the lifecycle events, and the extension
   * record. `BID_PLACED` is written before `EXTENDED`, so the event history
   * reads in the order the two happened.
   */
  private async writeAcceptedBid(
    transaction: Prisma.TransactionClient,
    write: AcceptedBidWrite,
  ): Promise<AcceptedBidResult> {
    const { auction, amount, bidderId, extension } = write;

    const bid = await transaction.bid.create({
      data: {
        auctionId: auction.id,
        bidderId,
        amount,
        sequenceNo: write.sequenceNo,
        clientRequestId: write.clientRequestId,
        placedAt: write.placedAt,
      },
      select: {
        id: true,
        auctionId: true,
        clientRequestId: true,
        amount: true,
        sequenceNo: true,
        placedAt: true,
      },
    });

    const previousHighestBid = auction.bids[0] ?? null;

    if (previousHighestBid && previousHighestBid.bidderId !== bidderId) {
      await this.notificationsService.createOutbidNotification(transaction, {
        userId: previousHighestBid.bidderId,
        auctionId: auction.id,
        //new higher bid ID
        bidId: bid.id,
        auctionTitle: auction.title,
        currentPrice: amount.toFixed(2),
        currency: auction.currency,
      });
    }

    await transaction.auctionEvent.create({
      data: {
        auctionId: auction.id,
        actorUserId: bidderId,
        bidId: bid.id,
        eventType: AuctionEventType.BID_PLACED,
      },
    });

    let recordedExtension: AcceptedBidResult['extension'] = null;

    if (extension.shouldExtend) {
      recordedExtension = await transaction.auctionExtension.create({
        data: {
          auctionId: auction.id,
          triggeredByBidId: bid.id,
          extensionNumber: write.extensionNumber,
          previousEndAt: extension.previousEndAt,
          newEndAt: extension.newEndAt,
        },
        select: {
          extensionNumber: true,
          previousEndAt: true,
          newEndAt: true,
        },
      });

      await transaction.auctionEvent.create({
        data: {
          auctionId: auction.id,
          actorUserId: bidderId,
          bidId: bid.id,
          eventType: AuctionEventType.EXTENDED,
        },
      });
    }

    return {
      bid,
      auction: {
        currentPrice: amount,
        reservePrice: auction.reservePrice,
        bidCount: write.sequenceNo,
        currentEndAt: extension.newEndAt,
      },
      extension: recordedExtension,
    };
  }
}
