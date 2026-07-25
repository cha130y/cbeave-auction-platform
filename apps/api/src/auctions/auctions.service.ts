import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAuctionDraftInput } from './types/create-auction-draft.input';
import { AuctionDraftResponseDto } from './dto/auction-draft-response.dto';
import { AuctionEventType, Prisma } from '../generated/prisma/client';
import { auctionDraftSelect } from './queries/auction-draft.select';
import { mapAuctionDraftResponse } from './mappers/map-auction-draft-response.mapper';

@Injectable()
export class AuctionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(
    input: CreateAuctionDraftInput,
  ): Promise<AuctionDraftResponseDto> {
    const startingPrice = new Prisma.Decimal(input.startingPrice);
    const minBidIncrement = new Prisma.Decimal(input.minBidIncrement);

    const reservePrice =
      input.reservePrice !== undefined && input.reservePrice !== null
        ? new Prisma.Decimal(input.reservePrice)
        : null;

    if (
      //lte means “less than or equal to.”
      startingPrice.lte(0) ||
      minBidIncrement.lte(0) ||
      reservePrice?.lte(0)
    ) {
      throw new BadRequestException('Auction prices must be greater than zero');
    }

    if (reservePrice && reservePrice.lt(startingPrice)) {
      //lt means “strictly less than.”
      throw new BadRequestException(
        'Reserve price cannot be lower than starting price',
      );
    }

    const scheduledStartAt = input.scheduledStartAt ?? null;
    const scheduledEndAt = input.scheduledEndAt ?? null;

    const hasScheduledStart = scheduledStartAt !== null;
    const hasScheduledEnd = scheduledEndAt !== null;

    if (hasScheduledStart !== hasScheduledEnd) {
      throw new BadRequestException(
        'Scheduled start and end times must be supplied together',
      );
    }

    if (
      scheduledStartAt &&
      scheduledEndAt &&
      scheduledEndAt <= scheduledStartAt
    ) {
      throw new BadRequestException(
        'Scheduled end time must be later than start time',
      );
    }

    const auction = await this.prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findUnique({
        where: {
          id: input.categoryId,
        },
        select: {
          isActive: true,
        },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      if (!category.isActive) {
        throw new BadRequestException('Auction category must be active');
      }

      const createdAuction = await transaction.auction.create({
        data: {
          sellerId: input.sellerId,
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          startingPrice,
          reservePrice,
          minBidIncrement,
          currentPrice: startingPrice,
          scheduledStartAt,
          originalEndAt: scheduledEndAt,
          currentEndAt: scheduledEndAt,
        },
        select: auctionDraftSelect,
      });

      await transaction.auctionEvent.create({
        data: {
          auctionId: createdAuction.id,
          actorUserId: input.sellerId,
          eventType: AuctionEventType.CREATED,
        },
      });
      return createdAuction;
    });
    return mapAuctionDraftResponse(auction);
  }
}
