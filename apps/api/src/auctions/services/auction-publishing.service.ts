import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuctionEventType, AuctionStatus } from '../../generated/prisma/client';
import { PublishAuctionInput } from '../types/publish-auction.input';
import { PublishAuctionResponseDto } from '../dto/publish-auction-response.dto';
import { publishAuctionSelect } from '../queries/publish-auction.select';
import {
  publishableAuctionSelect,
  PublishableAuctionRecord,
} from '../queries/publishable-auction.select';
import { mapPublishAuctionResponse } from '../mappers/map-publish-auction-response.mapper';
import { assertValidAuctionPricing } from '../utils/assert-valid-auction-pricing.util';

/**
 * Publication is the command that turns a draft into a live auction. It is the
 * only way out of DRAFT, so everything the marketplace assumes about a visible
 * auction is checked here before the status moves.
 */
@Injectable()
export class AuctionPublishingService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(
    input: PublishAuctionInput,
  ): Promise<PublishAuctionResponseDto> {
    const now = new Date();

    const publishedAuction = await this.prisma.$transaction(
      async (transaction) => {
        const auction = await transaction.auction.findFirst({
          where: {
            id: input.auctionId,
            sellerId: input.sellerId,
            deletedAt: null,
          },
          select: publishableAuctionSelect,
        });

        if (!auction) {
          throw new NotFoundException('Auction draft not found');
        }

        const scheduledStartAt = this.resolvePublicationStart(auction, now);

        const nextStatus =
          scheduledStartAt > now
            ? AuctionStatus.SCHEDULED
            : AuctionStatus.ACTIVE;

        const updateResult = await transaction.auction.updateMany({
          where: {
            id: auction.id,
            sellerId: input.sellerId,
            status: AuctionStatus.DRAFT,
            deletedAt: null,
            rowVersion: auction.rowVersion,
          },
          data: {
            status: nextStatus,
            publishedAt: now,
            startedAt: nextStatus === AuctionStatus.ACTIVE ? now : null,
            rowVersion: {
              increment: 1,
            },
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'Auction draft changed; reload and try again',
          );
        }

        await transaction.auctionEvent.create({
          data: {
            auctionId: auction.id,
            actorUserId: input.sellerId,
            eventType: AuctionEventType.PUBLISHED,
          },
        });

        if (nextStatus === AuctionStatus.ACTIVE) {
          await transaction.auctionEvent.create({
            data: {
              auctionId: auction.id,
              actorUserId: input.sellerId,
              eventType: AuctionEventType.STARTED,
            },
          });
        }

        const updatedAuction = await transaction.auction.findUnique({
          where: {
            id: auction.id,
          },
          select: publishAuctionSelect,
        });

        if (!updatedAuction) {
          throw new NotFoundException('Published auction not found');
        }

        return updatedAuction;
      },
    );

    return mapPublishAuctionResponse(publishedAuction);
  }

  /**
   * Rejects every draft that is not ready to be seen, and returns the start
   * time that decides whether publication schedules the auction or starts it.
   */
  private resolvePublicationStart(
    auction: PublishableAuctionRecord,
    now: Date,
  ): Date {
    if (auction.status !== AuctionStatus.DRAFT) {
      throw new ConflictException('Only draft auctions can be published');
    }

    if (!auction.title.trim() || !auction.description.trim()) {
      throw new BadRequestException(
        'Auction title and description are required before publication',
      );
    }

    if (!auction.category.isActive) {
      throw new BadRequestException('Auction category must be active');
    }

    assertValidAuctionPricing(
      auction.startingPrice,
      auction.minBidIncrement,
      auction.reservePrice,
    );

    if (!auction.scheduledStartAt || !auction.currentEndAt) {
      throw new BadRequestException(
        'Auction schedule is required before publication',
      );
    }

    if (auction.currentEndAt <= auction.scheduledStartAt) {
      throw new BadRequestException(
        'Auction end time must be later than start time',
      );
    }

    if (auction.currentEndAt <= now) {
      throw new BadRequestException('Auction end time must be in the future');
    }

    if (auction._count.auctionImages === 0) {
      throw new BadRequestException(
        'At least one auction image is required before publication',
      );
    }

    if (auction.auctionImages.length !== 1) {
      throw new BadRequestException(
        'Auction must have exactly one primary image before publication',
      );
    }

    return auction.scheduledStartAt;
  }
}
