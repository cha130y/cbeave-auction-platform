import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { placeBidAuctionSelect } from './queries/place-bid-auction.select';
import { mapPlaceBidResponse } from './mappers/map-place-bid-response.mapper';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';

const ANTI_SNIPING_WINDOW_MS = 2 * 60 * 1000;
const ANTI_SNIPING_EXTENSION_MS = 2 * 60 * 1000;
const MAX_AUCTION_EXTENSIONS = 5;

@Injectable()
export class BiddingService {
  constructor(private readonly prisma: PrismaService) {}

  async placeBid(input: PlaceBidInput): Promise<PlaceBidResponseDto> {
    const amount = new Prisma.Decimal(input.amount);
    const now = new Date();

    if (amount.lte(0)) {
      throw new BadRequestException('Bid amount must be greater than zero');
    }

    try {
      const acceptedBid = await this.prisma.$transaction(
        async (transaction): Promise<AcceptedBidResult> => {
          const duplicateRequest = await transaction.bid.findUnique({
            where: {
              clientRequestId: input.clientRequestId,
            },
            select: {
              id: true,
            },
          });

          if (duplicateRequest) {
            throw new ConflictException(
              'Bid request has already been processed',
            );
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

          if (auction.status !== AuctionStatus.ACTIVE) {
            throw new ConflictException('Auction is not active');
          }

          if (auction.sellerId === input.bidderId) {
            throw new ForbiddenException(
              'The auction seller cannot bid on this auction',
            );
          }

          if (
            !auction.currentEndAt ||
            auction.currentEndAt.getTime() <= now.getTime()
          ) {
            throw new ConflictException('Auction has ended');
          }

          const minimumBid = auction.currentPrice.plus(auction.minBidIncrement);

          if (amount.lt(minimumBid)) {
            throw new BadRequestException(
              `Bid amount must be at least ${minimumBid.toFixed(2)}`,
            );
          }

          const remainingTimeMs =
            auction.currentEndAt.getTime() - now.getTime();

          const shouldExtend =
            remainingTimeMs <= ANTI_SNIPING_WINDOW_MS &&
            auction.extensionCount < MAX_AUCTION_EXTENSIONS;

          const previousEndAt = auction.currentEndAt;
          const newEndAt = shouldExtend
            ? new Date(
                auction.currentEndAt.getTime() + ANTI_SNIPING_EXTENSION_MS,
              )
            : auction.currentEndAt;

          const sequenceNo = auction.bidCount + 1;
          const extensionNumber = auction.extensionCount + 1;

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
              ...(shouldExtend
                ? {
                    currentEndAt: newEndAt,
                    extensionCount: {
                      increment: 1,
                    },
                  }
                : {}),
            },
          });

          if (updateResult.count !== 1) {
            throw new ConflictException(
              'Auction changed; reload and try again',
            );
          }

          const bid = await transaction.bid.create({
            data: {
              auctionId: auction.id,
              bidderId: input.bidderId,
              amount,
              sequenceNo,
              clientRequestId: input.clientRequestId,
              placedAt: now,
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

          await transaction.auctionEvent.create({
            data: {
              auctionId: auction.id,
              actorUserId: input.bidderId,
              bidId: bid.id,
              eventType: AuctionEventType.BID_PLACED,
            },
          });

          let extension: AcceptedBidResult['extension'] = null;

          if (shouldExtend) {
            extension = await transaction.auctionExtension.create({
              data: {
                auctionId: auction.id,
                triggeredByBidId: bid.id,
                extensionNumber,
                previousEndAt,
                newEndAt,
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
                actorUserId: input.bidderId,
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
              bidCount: sequenceNo,
              currentEndAt: newEndAt,
            },
            extension,
          };
        },
        {
          //handle transactions that nearly the same time only one transaction can be accepted
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return mapPlaceBidResponse(acceptedBid);
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Bid request has already benn processed');
        }

        if (error.code === 'P2034') {
          throw new ConflictException('Auction changed; reload and try again');
        }
      }
      throw error;
    }
  }
}
